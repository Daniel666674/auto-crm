import { NextResponse } from 'next/server';

const KEY = process.env.BREVO_API_KEY || '';
const H = { 'api-key': KEY, 'Content-Type': 'application/json' };

export async function GET() {
  try {
    // Fetch first sent campaign from list (with statistics=true)
    const listRes = await fetch(
      'https://api.brevo.com/v3/emailCampaigns?limit=1&offset=0&status=sent&statistics=true',
      { headers: H }
    );
    const listData = await listRes.json();
    const firstCampaign = listData?.campaigns?.[0];

    if (!firstCampaign) {
      return NextResponse.json({ error: 'No sent campaigns found', listData });
    }

    // Also fetch the same campaign via detail endpoint
    const detailRes = await fetch(
      `https://api.brevo.com/v3/emailCampaigns/${firstCampaign.id}`,
      { headers: H }
    );
    const detailData = await detailRes.json();

    return NextResponse.json({
      campaignId: firstCampaign.id,
      campaignName: firstCampaign.name,
      listEndpoint: {
        statisticsField: firstCampaign.statistics,
        statisticsKeys: firstCampaign.statistics ? Object.keys(firstCampaign.statistics) : [],
        hasGlobalStats: !!firstCampaign.statistics?.globalStats,
        globalStatsKeys: firstCampaign.statistics?.globalStats
          ? Object.keys(firstCampaign.statistics.globalStats)
          : [],
      },
      detailEndpoint: {
        statisticsField: detailData.statistics,
        statisticsKeys: detailData.statistics ? Object.keys(detailData.statistics) : [],
        hasGlobalStats: !!detailData.statistics?.globalStats,
        globalStatsKeys: detailData.statistics?.globalStats
          ? Object.keys(detailData.statistics.globalStats)
          : [],
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
