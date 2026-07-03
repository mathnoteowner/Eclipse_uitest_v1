/**
 * 自分（受託者側）プロフィール。
 * 実装は Phase I で Supabase の profiles に差し替える。
 * この値もPIIとしてマスク対象になる（テンプレートに生では渡さない）。
 */
export interface FreelancerProfile {
  name: string;
  shopName: string;
}

export interface ProfileService {
  get(): FreelancerProfile;
}

export class MockProfileService implements ProfileService {
  get(): FreelancerProfile {
    return { name: "山田太郎", shopName: "スタジオ・サンプル" };
  }
}
