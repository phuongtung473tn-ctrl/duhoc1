export const templateMap = {
  offer: {
    badge: "Ưu đãi đặc biệt",
    title: "Nhận tư vấn miễn phí + lộ trình học phù hợp",
    description:
      "Bạn đang quan tâm đến chương trình du học nghề. Nhận ngay lộ trình học, danh sách ngành hot, và ưu đãi học bổng phù hợp với mục tiêu của bạn.",
    cta: "Nhận tư vấn ngay",
  },
  urgency: {
    badge: "Sắp hết suất",
    title: "Còn ít suất ưu tiên cho học bổng và tư vấn 1:1",
    description:
      "Chúng tôi đang ưu tiên xét duyệt cho khách quan tâm trong 24h tới. Đăng ký ngay để nhận lịch tư vấn riêng và ưu đãi phù hợp.",
    cta: "Đăng ký nhận ưu đãi",
  },
  trust: {
    badge: "Bảo mật thông tin",
    title: "Tư vấn miễn phí, không ép mua, không lo rủi ro",
    description:
      "Hình thức tư vấn trực tiếp qua chuyên viên, rõ ràng, minh bạch và phù hợp với từng nhu cầu của học viên và gia đình.",
    cta: "Nhận tư vấn 1:1",
  },
  premium: {
    badge: "Chương trình premium",
    title: "Được tư vấn theo lộ trình cá nhân và hỗ trợ 1:1",
    description:
      "Bạn đang ở giai đoạn muốn chọn đúng ngành, thời điểm và chiến lược học tối ưu nhất để tối đa hóa cơ hội việc làm sau tốt nghiệp.",
    cta: "Ưu tiên đăng ký ngay",
  },
  limited: {
    badge: "Chỉ còn vài suất",
    title: "Học bổng và tư vấn ưu tiên đang chốt nhanh",
    description:
      "Cơ hội nhận tư vấn chuyên sâu, hỗ trợ hồ sơ và gợi ý ngành phù hợp đang có giới hạn theo từng đợt tuyển sinh.",
    cta: "Đặt lịch tư vấn",
  },
} as const;

export function getExitIntentTemplate(config: {
  templateId?: keyof typeof templateMap;
  badge?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
}) {
  const selected =
    templateMap[config.templateId ?? "offer"] ?? templateMap.offer;

  return {
    badge: config.badge || selected.badge,
    title: config.title || selected.title,
    description: config.description || selected.description,
    cta: config.ctaLabel || selected.cta,
  };
}
