import { Hono } from 'hono'
import { authMiddleware } from './auth'

type Bindings = {
  DB: D1Database
}

const missions = new Hono<{ Bindings: Bindings }>()

// 전체 미션 목록 조회 (활성화된 미션만)
missions.get('/', async (c) => {
  try {
    const missionsList = await c.env.DB.prepare(`
      SELECT 
        id, title, description, start_date, end_date, 
        created_at, updated_at
      FROM missions 
      WHERE is_active = 1 
      ORDER BY created_at DESC
    `).all()
    
    return c.json({
      success: true,
      missions: missionsList.results
    })
  } catch (error) {
    console.error('Missions fetch error:', error)
    return c.json({ success: false, message: '미션 목록을 가져오는데 실패했습니다.' }, 500)
  }
})

// 특정 미션 상세 조회
missions.get('/:id', async (c) => {
  try {
    const missionId = c.req.param('id')
    
    const mission = await c.env.DB.prepare(`
      SELECT 
        id, title, description, start_date, end_date,
        created_at, updated_at, is_active
      FROM missions 
      WHERE id = ?
    `).bind(missionId).first()
    
    if (!mission) {
      return c.json({ success: false, message: '미션을 찾을 수 없습니다.' }, 404)
    }
    
    // 참여자 수 조회
    const participantCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM mission_participations 
      WHERE mission_id = ?
    `).bind(missionId).first()
    
    return c.json({
      success: true,
      mission: {
        ...mission,
        participant_count: participantCount?.count || 0
      }
    })
  } catch (error) {
    console.error('Mission detail fetch error:', error)
    return c.json({ success: false, message: '미션 정보를 가져오는데 실패했습니다.' }, 500)
  }
})

// 미션 참여
missions.post('/:id/join', authMiddleware, async (c) => {
  try {
    const missionId = c.req.param('id')
    const user = c.get('user')
    
    // 미션 존재 여부 확인
    const mission = await c.env.DB.prepare(
      'SELECT id FROM missions WHERE id = ? AND is_active = 1'
    ).bind(missionId).first()
    
    if (!mission) {
      return c.json({ success: false, message: '활성화된 미션을 찾을 수 없습니다.' }, 404)
    }
    
    // 이미 참여했는지 확인
    const existingParticipation = await c.env.DB.prepare(
      'SELECT id FROM mission_participations WHERE user_id = ? AND mission_id = ?'
    ).bind(user.user_id, missionId).first()
    
    if (existingParticipation) {
      return c.json({ success: false, message: '이미 참여한 미션입니다.' }, 400)
    }
    
    // 미션 참여 등록
    const result = await c.env.DB.prepare(
      'INSERT INTO mission_participations (user_id, mission_id) VALUES (?, ?)'
    ).bind(user.user_id, missionId).run()
    
    if (result.success) {
      return c.json({ 
        success: true, 
        message: '미션 참여가 완료되었습니다.',
        participation_id: result.meta.last_row_id
      })
    } else {
      return c.json({ success: false, message: '미션 참여에 실패했습니다.' }, 500)
    }
  } catch (error) {
    console.error('Mission join error:', error)
    return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 사용자의 참여 미션 목록 조회
missions.get('/my/list', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    
    const myMissions = await c.env.DB.prepare(`
      SELECT 
        m.id, m.title, m.description, m.start_date, m.end_date,
        mp.joined_at,
        COUNT(mv.id) as verification_count,
        COUNT(CASE WHEN mv.verification_status = 'completed' THEN 1 END) as completed_count
      FROM mission_participations mp
      JOIN missions m ON mp.mission_id = m.id
      LEFT JOIN mission_verifications mv ON mp.mission_id = mv.mission_id AND mp.user_id = mv.user_id
      WHERE mp.user_id = ? AND m.is_active = 1
      GROUP BY m.id, mp.id
      ORDER BY mp.joined_at DESC
    `).bind(user.user_id).all()
    
    return c.json({
      success: true,
      missions: myMissions.results
    })
  } catch (error) {
    console.error('My missions fetch error:', error)
    return c.json({ success: false, message: '참여 미션 목록을 가져오는데 실패했습니다.' }, 500)
  }
})

// 미션 인증 제출
missions.post('/:id/verify', authMiddleware, async (c) => {
  try {
    const missionId = c.req.param('id')
    const user = c.get('user')
    const { blog_url, review_text } = await c.req.json()
    
    if (!blog_url || !blog_url.trim()) {
      return c.json({ success: false, message: '블로그 URL을 입력해주세요.' }, 400)
    }
    
    // 후기글 길이 검증 (150자 제한)
    if (review_text && review_text.length > 150) {
      return c.json({ success: false, message: '후기글은 150자 이내로 작성해주세요.' }, 400)
    }
    
    // URL 형식 검증
    try {
      new URL(blog_url)
    } catch {
      return c.json({ success: false, message: '올바른 URL 형식이 아닙니다.' }, 400)
    }
    
    // 미션 참여 여부 확인
    const participation = await c.env.DB.prepare(
      'SELECT id FROM mission_participations WHERE user_id = ? AND mission_id = ?'
    ).bind(user.user_id, missionId).first()
    
    if (!participation) {
      return c.json({ success: false, message: '먼저 미션에 참여해주세요.' }, 400)
    }
    
    // 인증 제출 (후기글 포함)
    const result = await c.env.DB.prepare(`
      INSERT INTO mission_verifications (user_id, mission_id, blog_url, review_text, verification_status)
      VALUES (?, ?, ?, ?, 'pending')
    `).bind(user.user_id, missionId, blog_url, review_text || '').run()
    
    if (result.success) {
      // 여기서 웹 크롤링 로직을 추가할 수 있습니다.
      // 현재는 간단히 pending 상태로 저장
      
      return c.json({ 
        success: true, 
        message: '인증이 제출되었습니다. 확인 중입니다...',
        verification_id: result.meta.last_row_id
      })
    } else {
      return c.json({ success: false, message: '인증 제출에 실패했습니다.' }, 500)
    }
  } catch (error) {
    console.error('Mission verification error:', error)
    return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 특정 미션의 내 인증 현황 조회
missions.get('/:id/my-verifications', authMiddleware, async (c) => {
  try {
    const missionId = c.req.param('id')
    const user = c.get('user')
    
    const verifications = await c.env.DB.prepare(`
      SELECT 
        id, blog_url, review_text, verification_status, crawl_result,
        submitted_at, verified_at
      FROM mission_verifications
      WHERE user_id = ? AND mission_id = ?
      ORDER BY submitted_at DESC
    `).bind(user.user_id, missionId).all()
    
    return c.json({
      success: true,
      verifications: verifications.results
    })
  } catch (error) {
    console.error('User verifications fetch error:', error)
    return c.json({ success: false, message: '인증 현황을 가져오는데 실패했습니다.' }, 500)
  }
})

export default missions