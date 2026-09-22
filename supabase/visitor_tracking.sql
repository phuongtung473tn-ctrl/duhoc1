create table if not exists public.visitor_sessions (
	id text primary key,
	visitor_id text not null,
	visited_day date not null,
	visited_month text not null,
	source text,
	medium text,
	campaign text,
	content text,
	device_model text,
	device_kind text,
	os text,
	browser text,
	variant text,
	created_at timestamptz not null default now()
);

alter table public.visitor_sessions add column if not exists variant text;

alter table public.visitor_sessions enable row level security;
grant insert on public.visitor_sessions to anon, authenticated;
grant select on public.visitor_sessions to authenticated;
drop policy if exists "visitor sessions can be created by public form" on public.visitor_sessions;
create policy "visitor sessions can be created by public form"
	on public.visitor_sessions for insert
	to anon, authenticated
	with check (length(visitor_id) between 1 and 128 and length(id) between 1 and 128);
drop policy if exists "visitor sessions can be counted by public form" on public.visitor_sessions;
create policy "visitor sessions can be counted by public form"
	on public.visitor_sessions for select
	to authenticated;

drop function if exists public.record_visitor_session(text, text, text, text, text, text, text, text, text, text);

create or replace function public.record_visitor_session(
	p_id text,
	p_visitor_id text,
	p_source text default null,
	p_medium text default null,
	p_campaign text default null,
	p_content text default null,
	p_device_model text default null,
	p_device_kind text default null,
	p_os text default null,
	p_browser text default null,
	p_variant text default null
)
returns table(today_count bigint, month_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
	if length(p_id) not between 1 and 128 or length(p_visitor_id) not between 1 and 128 then
		raise exception 'invalid visitor session';
	end if;

	insert into public.visitor_sessions (
		id, visitor_id, visited_day, visited_month, source, medium, campaign,
				content, device_model, device_kind, os, browser, variant
	)
	values (
		p_id, p_visitor_id, current_date, to_char(current_date, 'YYYY-MM'),
		nullif(left(p_source, 100), ''), nullif(left(p_medium, 100), ''),
		nullif(left(p_campaign, 100), ''), nullif(left(p_content, 100), ''),
		nullif(left(p_device_model, 150), ''), nullif(left(p_device_kind, 30), ''),
				nullif(left(p_os, 100), ''), nullif(left(p_browser, 100), ''),
				nullif(left(p_variant, 1), '')
	)
	on conflict (id) do nothing;

	return query
	select
		(select count(*) from public.visitor_sessions where visited_day = current_date),
		(select count(*) from public.visitor_sessions where visited_month = to_char(current_date, 'YYYY-MM'));
end;
$$;

revoke all on function public.record_visitor_session(text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.record_visitor_session(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.get_recent_lead_notifications()
returns table(id uuid, name text, city text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
	select id, left(coalesce(name, ''), 80), left(coalesce(city, ''), 80), created_at
	from public.leads
	where created_at >= now() - interval '24 hours'
		and nullif(trim(name), '') is not null
	order by created_at desc
	limit 20;
$$;

revoke all on function public.get_recent_lead_notifications() from public;
grant execute on function public.get_recent_lead_notifications() to anon, authenticated;

create or replace function public.get_funnel_analytics()
returns table(data jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
	result jsonb;
begin
	if not public.is_funnel_admin() then
		raise exception 'admin access required';
	end if;
	select jsonb_build_object(
		'visits', (select count(*) from public.visitor_sessions),
		'leads', (select count(*) from public.leads),
		'bySource', coalesce((select jsonb_object_agg(source_name, visit_count) from (
			select coalesce(nullif(source, ''), 'direct') source_name, count(*) visit_count
			from public.visitor_sessions group by 1
		) visits), '{}'::jsonb),
		'bySourceStats', coalesce((select jsonb_object_agg(source_name, jsonb_build_object('visits', visits, 'leads', leads)) from (
			select source_name, count(*) filter (where kind = 'visit') visits, count(*) filter (where kind = 'lead') leads
			from (
				select coalesce(nullif(source, ''), 'direct') source_name, 'visit' kind from public.visitor_sessions
				union all
				select coalesce(nullif(utm_source, ''), nullif(traffic_ads_source, ''), 'direct') source_name, 'lead' kind from public.leads
			) sources group by source_name
		) stats), '{}'::jsonb),
		'byVariant', coalesce((select jsonb_object_agg(variant_name, jsonb_build_object('visits', visits, 'leads', leads)) from (
			select variant_name, count(*) filter (where kind = 'visit') visits, count(*) filter (where kind = 'lead') leads
			from (
				select nullif(variant, '') variant_name, 'visit' kind from public.visitor_sessions where nullif(variant, '') is not null
				union all
				select nullif(variant, '') variant_name, 'lead' kind from public.leads where nullif(variant, '') is not null
			) variants group by variant_name
		) variant_stats), '{}'::jsonb),
		'daily', coalesce((select jsonb_object_agg(day_key, jsonb_build_object('date', day_key, 'visits', visits, 'leads', leads, 'bySource', '{}'::jsonb, 'bySourceStats', '{}'::jsonb, 'byVariant', '{}'::jsonb)) from (
			select day_key, count(*) filter (where kind = 'visit') visits, count(*) filter (where kind = 'lead') leads
			from (
				select visited_day::text day_key, 'visit' kind from public.visitor_sessions
				union all
				select created_at::date::text day_key, 'lead' kind from public.leads
			) days group by day_key
		) daily_stats), '{}'::jsonb)
	) into result;
	return query select result;
end;
$$;

revoke all on function public.get_funnel_analytics() from public;
grant execute on function public.get_funnel_analytics() to authenticated;

create or replace function public.reset_funnel_analytics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if not public.is_funnel_admin() then
		raise exception 'admin access required';
	end if;
	-- Chỉ reset số liệu lượt truy cập, KHÔNG đụng tới bảng leads (CRM); muốn xóa lead hãy dùng clear_funnel_leads().
	delete from public.visitor_sessions where true;
	insert into public.funnel_analytics (id, data, updated_at)
	values (1, '{"visits":0,"leads":0,"bySource":{},"bySourceStats":{},"byVariant":{}}'::jsonb, now())
	on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.reset_funnel_analytics() from public;
grant execute on function public.reset_funnel_analytics() to authenticated;
