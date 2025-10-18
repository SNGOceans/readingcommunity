import { Hono } from 'hono'
import { authMiddleware, adminMiddleware } from './auth'

type Bindings = {
  DB: D1Database
}

const admin = new Hono<{ Bindings: Bindings }>()

// 모든 관리자 라우트에 인증 및 관리자 권한 확인 적용
admin.use('*', authMiddleware, adminMiddleware)

// 전체 미션 목록 조회 (관리자용 - 비활성 미션 포함)
admin.get('/missions', async (c) => {
  try {
    const missions = await c.env.DB.prepare(`
      SELECT 
        m.id, m.title, m.description, m.start_date, m.end_date,
        m.is_active, m.created_at, m.updated_at,
        COUNT(DISTINCT mp.id) as participant_count,
        COUNT(DISTINCT mv.id) as total_verifications,
        COUNT(DISTINCT CASE WHEN mv.verification_status = 'completed' THEN mv.id END) as completed_verifications
      FROM missions m
      LEFT JOIN mission_participations mp ON m.id = mp.mission_id
      LEFT JOIN mission_verifications mv ON m.id = mv.mission_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `).all()
    
    return c.json({
      success: true,
      missions: missions.results
    })
  } catch (error) {
    console.error('Admin missions fetch error:', error)
    return c.json({ success: false, message: '미션 목록을 가져오는데 실패했습니다.' }, 500)
  }
})

// 미션 생성
admin.post('/missions', async (c) => {
  try {
    const { title, description, start_date, end_date } = await c.req.json()
    
    if (!title || !start_date || !end_date) {
      return c.json({ 
        success: false, 
        message: '제목, 시작일, 종료일은 필수 항목입니다.' 
      }, 400)
    }
    
    // 날짜 형식 검증
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return c.json({ success: false, message: '올바른 날짜 형식이 아닙니다.' }, 400)
    }
    
    if (endDate <= startDate) {
      return c.json({ success: false, message: '종료일은 시작일보다 늦어야 합니다.' }, 400)
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO missions (title, description, start_date, end_date, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).bind(title, description || '', start_date, end_date).run()
    
    if (result.success) {
      return c.json({
        success: true,
        message: '미션이 생성되었습니다.',
        mission_id: result.meta.last_row_id
      })
    } else {
      return c.json({ success: false, message: '미션 생성에 실패했습니다.' }, 500)
    }
  } catch (error) {
    console.error('Mission creation error:', error)
    return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 미션 수정
admin.put('/missions/:id', async (c) => {
  try {
    const missionId = c.req.param('id')
    const { title, description, start_date, end_date, is_active } = await c.req.json()
    
    // 미션 존재 확인
    const existingMission = await c.env.DB.prepare(
      'SELECT id FROM missions WHERE id = ?'
    ).bind(missionId).first()
    
    if (!existingMission) {
      return c.json({ success: false, message: '미션을 찾을 수 없습니다.' }, 404)
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE missions 
      SET title = ?, description = ?, start_date = ?, end_date = ?, 
          is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(title, description, start_date, end_date, is_active ? 1 : 0, missionId).run()
    
    if (result.success) {
      return c.json({ success: true, message: '미션이 수정되었습니다.' })
    } else {
      return c.json({ success: false, message: '미션 수정에 실패했습니다.' }, 500)
    }
  } catch (error) {
    console.error('Mission update error:', error)
    return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 미션 삭제
admin.delete('/missions/:id', async (c) => {
  try {
    const missionId = c.req.param('id')
    
    // 참여자가 있는지 확인
    const participantCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM mission_participations WHERE mission_id = ?'
    ).bind(missionId).first()
    
    if ((participantCount?.count as number) > 0) {
      return c.json({ 
        success: false, 
        message: '참여자가 있는 미션은 삭제할 수 없습니다. 비활성화를 권장합니다.' 
      }, 400)
    }
    
    const result = await c.env.DB.prepare(
      'DELETE FROM missions WHERE id = ?'
    ).bind(missionId).run()
    
    if (result.success) {
      return c.json({ success: true, message: '미션이 삭제되었습니다.' })
    } else {
      return c.json({ success: false, message: '미션 삭제에 실패했습니다.' }, 500)
    }
  } catch (error) {
    console.error('Mission deletion error:', error)
    return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 전체 참여자 현황 조회
admin.get('/participants', async (c) => {
  try {
    const participants = await c.env.DB.prepare(`
      SELECT 
        u.id, u.name, u.email,
        (SELECT COUNT(DISTINCT mp.mission_id) 
         FROM mission_participations mp 
         WHERE mp.user_id = u.id) as joined_missions,
        (SELECT COUNT(*) 
         FROM mission_verifications mv 
         WHERE mv.user_id = u.id) as total_verifications,
        (SELECT COUNT(*) 
         FROM mission_verifications mv 
         WHERE mv.user_id = u.id AND mv.verification_status = 'completed') as completed_verifications,
        u.created_at as joined_date
      FROM users u
      WHERE u.is_admin = 0
      ORDER BY u.created_at DESC
    `).all()
    
    return c.json({
      success: true,
      participants: participants.results
    })
  } catch (error) {
    console.error('Participants fetch error:', error)
    return c.json({ success: false, message: '참여자 현황을 가져오는데 실패했습니다.' }, 500)
  }
})

// 특정 미션의 참여자 및 인증 현황
admin.get('/missions/:id/participants', async (c) => {
  try {
    const missionId = c.req.param('id')
    
    const participants = await c.env.DB.prepare(`
      SELECT 
        u.id, u.name, u.email,
        mp.joined_at,
        COUNT(mv.id) as verification_count,
        COUNT(CASE WHEN mv.verification_status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN mv.verification_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN mv.verification_status = 'needs_review' THEN 1 END) as review_count
      FROM mission_participations mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN mission_verifications mv ON mp.user_id = mv.user_id AND mp.mission_id = mv.mission_id
      WHERE mp.mission_id = ?
      GROUP BY u.id, mp.id
      ORDER BY mp.joined_at DESC
    `).bind(missionId).all()
    
    return c.json({
      success: true,
      participants: participants.results
    })
  } catch (error) {
    console.error('Mission participants fetch error:', error)
    return c.json({ success: false, message: '미션 참여자 현황을 가져오는데 실패했습니다.' }, 500)
  }
})

// 인증 현황 관리 - 모든 인증 목록
admin.get('/verifications', async (c) => {
  try {
    const { status, mission_id } = c.req.query()
    
    let query = `
      SELECT 
        mv.id, mv.blog_url, mv.review_text, mv.verification_status, mv.crawl_result,
        mv.submitted_at, mv.verified_at,
        u.name as user_name, u.email as user_email,
        m.title as mission_title
      FROM mission_verifications mv
      JOIN users u ON mv.user_id = u.id
      JOIN missions m ON mv.mission_id = m.id
    `
    
    const conditions = []
    const bindings = []
    
    if (status) {
      conditions.push('mv.verification_status = ?')
      bindings.push(status)
    }
    
    if (mission_id) {
      conditions.push('mv.mission_id = ?')
      bindings.push(mission_id)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY mv.submitted_at DESC'
    
    const statement = c.env.DB.prepare(query)
    const verifications = bindings.length > 0 ? 
      await statement.bind(...bindings).all() : 
      await statement.all()
    
    return c.json({
      success: true,
      verifications: verifications.results
    })
  } catch (error) {
    console.error('Verifications fetch error:', error)
    return c.json({ success: false, message: '인증 현황을 가져오는데 실패했습니다.' }, 500)
  }
})

// 인증 상태 업데이트 (수동 검토)
admin.put('/verifications/:id', async (c) => {
  try {
    const verificationId = c.req.param('id')
    const { verification_status, crawl_result } = await c.req.json()
    
    if (!verification_status || !['completed', 'needs_review', 'pending'].includes(verification_status)) {
      return c.json({ 
        success: false, 
        message: '올바른 인증 상태를 선택해주세요.' 
      }, 400)
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE mission_verifications 
      SET verification_status = ?, crawl_result = ?, verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(verification_status, crawl_result || null, verificationId).run()
    
    if (result.success) {
      return c.json({ success: true, message: '인증 상태가 업데이트되었습니다.' })
    } else {
      return c.json({ success: false, message: '인증 상태 업데이트에 실패했습니다.' }, 500)
    }
  } catch (error) {
    console.error('Verification update error:', error)
    return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 대시보드 통계 조회
admin.get('/dashboard/stats', async (c) => {
  try {
    // 전체 통계
    const totalUsers = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE is_admin = 0'
    ).first()
    
    const totalMissions = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM missions'
    ).first()
    
    const activeMissions = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM missions WHERE is_active = 1'
    ).first()
    
    const totalParticipations = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM mission_participations'
    ).first()
    
    const totalVerifications = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM mission_verifications'
    ).first()
    
    const completedVerifications = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM mission_verifications WHERE verification_status = "completed"'
    ).first()
    
    const pendingVerifications = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM mission_verifications WHERE verification_status = "pending"'
    ).first()
    
    return c.json({
      success: true,
      stats: {
        total_users: totalUsers?.count || 0,
        total_missions: totalMissions?.count || 0,
        active_missions: activeMissions?.count || 0,
        total_participations: totalParticipations?.count || 0,
        total_verifications: totalVerifications?.count || 0,
        completed_verifications: completedVerifications?.count || 0,
        pending_verifications: pendingVerifications?.count || 0
      }
    })
  } catch (error) {
    console.error('Dashboard stats fetch error:', error)
    return c.json({ success: false, message: '통계 정보를 가져오는데 실패했습니다.' }, 500)
  }
})

// 후기글 목록 조회 (관리자용)
admin.get('/reviews', async (c) => {
  try {
    const { mission_id, limit = 50 } = c.req.query()
    
    let query = `
      SELECT 
        mv.id, mv.blog_url, mv.review_text, mv.verification_status,
        mv.submitted_at,
        u.name as user_name, u.email as user_email,
        m.title as mission_title, m.id as mission_id
      FROM mission_verifications mv
      JOIN users u ON mv.user_id = u.id
      JOIN missions m ON mv.mission_id = m.id
      WHERE mv.review_text IS NOT NULL AND mv.review_text != ''
    `
    
    const bindings = []
    
    if (mission_id) {
      query += ' AND mv.mission_id = ?'
      bindings.push(mission_id)
    }
    
    query += ' ORDER BY mv.submitted_at DESC LIMIT ?'
    bindings.push(parseInt(limit as string))
    
    const statement = c.env.DB.prepare(query)
    const reviews = await statement.bind(...bindings).all()
    
    return c.json({
      success: true,
      reviews: reviews.results
    })
  } catch (error) {
    console.error('Reviews fetch error:', error)
    return c.json({ success: false, message: '후기글 목록을 가져오는데 실패했습니다.' }, 500)
  }
})

// 회원 삭제 (관리자만)
admin.delete('/users/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    
    if (!userId || isNaN(userId)) {
      return c.json({ success: false, message: '유효하지 않은 사용자 ID입니다.' }, 400)
    }
    
    // 현재 관리자 정보 가져오기
    const currentUser = c.get('user')
    
    // 자기 자신을 삭제하려는 경우 방지
    if (currentUser.user_id === userId) {
      return c.json({ success: false, message: '자기 자신을 삭제할 수 없습니다.' }, 400)
    }
    
    // 사용자 존재 여부 확인
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, is_admin FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (!user) {
      return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404)
    }
    
    // 다른 관리자를 삭제하려는 경우 방지
    if (user.is_admin) {
      return c.json({ success: false, message: '관리자 계정은 삭제할 수 없습니다.' }, 400)
    }
    
    // 사용자와 관련된 데이터 삭제 (외래키 제약조건 때문에 순서 중요)
    // 1. 인증 데이터 삭제
    await c.env.DB.prepare(
      'DELETE FROM mission_verifications WHERE user_id = ?'
    ).bind(userId).run()
    
    // 2. 참여 데이터 삭제
    await c.env.DB.prepare(
      'DELETE FROM mission_participations WHERE user_id = ?'
    ).bind(userId).run()
    
    // 3. 사용자 삭제
    const result = await c.env.DB.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(userId).run()
    
    if (!result.success) {
      return c.json({ success: false, message: '사용자 삭제에 실패했습니다.' }, 500)
    }
    
    return c.json({
      success: true,
      message: `사용자 "${user.name} (${user.email})"가 성공적으로 삭제되었습니다.`,
      deletedUser: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
    
  } catch (error) {
    console.error('User deletion error:', error)
    return c.json({ success: false, message: '사용자 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

export default admin