import { Hono } from 'hono'
import { authMiddleware } from './auth'

type Bindings = {
  DB: D1Database
}

const statistics = new Hono<{ Bindings: Bindings }>()

// 전체 커뮤니티 통계 (인증 없이 접근 가능)
statistics.get('/community', async (c) => {
  try {
    // 미션별 참여율 통계
    const missionParticipation = await c.env.DB.prepare(`
      SELECT 
        m.id,
        m.title,
        COUNT(DISTINCT mp.user_id) as participants,
        COUNT(DISTINCT mv.id) as total_verifications,
        COUNT(DISTINCT CASE WHEN mv.verification_status = 'completed' THEN mv.id END) as completed_verifications,
        m.start_date,
        m.end_date,
        m.is_active
      FROM missions m
      LEFT JOIN mission_participations mp ON m.id = mp.mission_id
      LEFT JOIN mission_verifications mv ON m.id = mv.mission_id
      WHERE m.is_active = 1
      GROUP BY m.id
      ORDER BY participants DESC
    `).all()

    // 월별 활동 통계
    const monthlyActivity = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_users
      FROM users 
      WHERE is_admin = 0
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `).all()

    // 인증 상태별 통계
    const verificationStatus = await c.env.DB.prepare(`
      SELECT 
        verification_status,
        COUNT(*) as count
      FROM mission_verifications
      GROUP BY verification_status
    `).all()

    // 주간 인증 제출 통계 (최근 데이터)
    const weeklyVerifications = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%W', submitted_at) as week_year,
        MIN(strftime('%Y-%m-%d', submitted_at)) as week_start,
        COUNT(*) as submissions
      FROM mission_verifications
      GROUP BY strftime('%Y-%W', submitted_at)
      ORDER BY week_year DESC
      LIMIT 8
    `).all()

    // 상위 활동 사용자 (TOP 10)
    const topUsers = await c.env.DB.prepare(`
      SELECT 
        u.name,
        (SELECT COUNT(DISTINCT mp.mission_id) 
         FROM mission_participations mp 
         WHERE mp.user_id = u.id) as missions_joined,
        (SELECT COUNT(*) 
         FROM mission_verifications mv 
         WHERE mv.user_id = u.id) as total_verifications,
        (SELECT COUNT(*) 
         FROM mission_verifications mv 
         WHERE mv.user_id = u.id AND mv.verification_status = 'completed') as completed_verifications
      FROM users u
      WHERE u.is_admin = 0
        AND (SELECT COUNT(*) FROM mission_verifications mv WHERE mv.user_id = u.id) > 0
      ORDER BY completed_verifications DESC, total_verifications DESC
      LIMIT 10
    `).all()

    return c.json({
      success: true,
      statistics: {
        missionParticipation: missionParticipation.results,
        monthlyActivity: monthlyActivity.results,
        verificationStatus: verificationStatus.results,
        weeklyVerifications: weeklyVerifications.results,
        topUsers: topUsers.results
      }
    })
  } catch (error) {
    console.error('Community statistics error:', error)
    return c.json({ success: false, message: '통계를 가져오는데 실패했습니다.' }, 500)
  }
})

// 개인 통계 (본인 데이터만) - 인증 필요
statistics.get('/personal', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    
    // 개인 미션 참여 이력
    const personalMissions = await c.env.DB.prepare(`
      SELECT 
        m.title,
        m.start_date,
        m.end_date,
        mp.joined_at,
        COUNT(mv.id) as total_verifications,
        COUNT(CASE WHEN mv.verification_status = 'completed' THEN 1 END) as completed_verifications,
        COUNT(CASE WHEN mv.verification_status = 'pending' THEN 1 END) as pending_verifications
      FROM mission_participations mp
      JOIN missions m ON mp.mission_id = m.id
      LEFT JOIN mission_verifications mv ON mp.mission_id = mv.mission_id AND mp.user_id = mv.user_id
      WHERE mp.user_id = ?
      GROUP BY mp.mission_id
      ORDER BY mp.joined_at DESC
    `).bind(user.user_id).all()

    // 개인 월별 인증 활동
    const monthlyVerifications = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', mv.submitted_at) as month,
        COUNT(*) as submissions,
        COUNT(CASE WHEN mv.verification_status = 'completed' THEN 1 END) as completed
      FROM mission_verifications mv
      WHERE mv.user_id = ?
      GROUP BY strftime('%Y-%m', mv.submitted_at)
      ORDER BY month DESC
      LIMIT 12
    `).bind(user.user_id).all()

    // 개인 인증 성공률 추이 (주별)
    const weeklyProgress = await c.env.DB.prepare(`
      SELECT 
        date(mv.submitted_at, 'weekday 0', '-6 days') as week_start,
        COUNT(*) as submissions,
        COUNT(CASE WHEN mv.verification_status = 'completed' THEN 1 END) as completed,
        ROUND(
          CAST(COUNT(CASE WHEN mv.verification_status = 'completed' THEN 1 END) AS FLOAT) * 100.0 / 
          COUNT(*), 2
        ) as success_rate
      FROM mission_verifications mv
      WHERE mv.user_id = ? AND mv.submitted_at >= date('now', '-12 weeks')
      GROUP BY week_start
      HAVING submissions > 0
      ORDER BY week_start
    `).bind(user.user_id).all()

    // 개인 카테고리별 활동 (미션 타입별 - 제목에서 키워드 추출)
    const categoryActivity = await c.env.DB.prepare(`
      SELECT 
        CASE 
          WHEN m.title LIKE '%독서%' OR m.title LIKE '%책%' THEN '독서'
          WHEN m.title LIKE '%영성%' OR m.title LIKE '%묵상%' OR m.title LIKE '%기도%' THEN '영성'
          WHEN m.title LIKE '%챌린지%' THEN '챌린지'
          WHEN m.title LIKE '%계획%' THEN '계획'
          ELSE '기타'
        END as category,
        COUNT(DISTINCT mp.mission_id) as missions_count,
        COUNT(mv.id) as verifications_count
      FROM mission_participations mp
      JOIN missions m ON mp.mission_id = m.id
      LEFT JOIN mission_verifications mv ON mp.mission_id = mv.mission_id AND mp.user_id = mv.user_id
      WHERE mp.user_id = ?
      GROUP BY category
      HAVING missions_count > 0
      ORDER BY missions_count DESC
    `).bind(user.user_id).all()

    return c.json({
      success: true,
      statistics: {
        personalMissions: personalMissions.results,
        monthlyVerifications: monthlyVerifications.results,
        weeklyProgress: weeklyProgress.results,
        categoryActivity: categoryActivity.results
      }
    })
  } catch (error) {
    console.error('Personal statistics error:', error)
    return c.json({ success: false, message: '개인 통계를 가져오는데 실패했습니다.' }, 500)
  }
})

// 미션별 상세 통계 (관리자용) - 인증 필요
statistics.get('/mission/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const missionId = c.req.param('id')
    
    // 본인이 참여한 미션이거나 관리자인 경우에만 접근 허용
    if (!user.is_admin) {
      const participation = await c.env.DB.prepare(
        'SELECT id FROM mission_participations WHERE user_id = ? AND mission_id = ?'
      ).bind(user.user_id, missionId).first()
      
      if (!participation) {
        return c.json({ success: false, message: '권한이 없습니다.' }, 403)
      }
    }

    // 일별 인증 제출 통계
    const dailySubmissions = await c.env.DB.prepare(`
      SELECT 
        date(submitted_at) as date,
        COUNT(*) as submissions,
        COUNT(CASE WHEN verification_status = 'completed' THEN 1 END) as completed
      FROM mission_verifications
      WHERE mission_id = ?
      GROUP BY date(submitted_at)
      ORDER BY date
    `).bind(missionId).all()

    // 참여자별 활동 통계
    const participantActivity = await c.env.DB.prepare(`
      SELECT 
        u.name,
        mp.joined_at,
        COUNT(mv.id) as total_submissions,
        COUNT(CASE WHEN mv.verification_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN mv.verification_status = 'pending' THEN 1 END) as pending,
        MAX(mv.submitted_at) as last_submission
      FROM mission_participations mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN mission_verifications mv ON mp.mission_id = mv.mission_id AND mp.user_id = mv.user_id
      WHERE mp.mission_id = ?
      GROUP BY mp.user_id
      ORDER BY completed DESC, total_submissions DESC
    `).bind(missionId).all()

    return c.json({
      success: true,
      statistics: {
        dailySubmissions: dailySubmissions.results,
        participantActivity: participantActivity.results
      }
    })
  } catch (error) {
    console.error('Mission statistics error:', error)
    return c.json({ success: false, message: '미션 통계를 가져오는데 실패했습니다.' }, 500)
  }
})

export default statistics