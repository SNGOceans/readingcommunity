import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database
}

const auth = new Hono<{ Bindings: Bindings }>()

// JWT 시크릿 키 (환경변수에서 가져오기)
const getJwtSecret = (c: any) => {
  return c.env.JWT_SECRET || 'dev-fallback-secret-change-in-production'
}

// 레거시 SHA-256 해시 (기존 사용자 호환용)
async function hashPasswordLegacy(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// PBKDF2를 사용한 안전한 비밀번호 해시 함수 (신규 사용자)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  
  // 랜덤한 salt 생성
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // PBKDF2로 해시 생성 (100,000 iterations)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )
  
  // salt와 해시를 결합하여 저장 (PBKDF2 구분을 위해 접두사 추가)
  const combined = new Uint8Array(salt.length + derivedBits.byteLength)
  combined.set(salt)
  combined.set(new Uint8Array(derivedBits), salt.length)
  
  return 'pbkdf2:' + Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // PBKDF2 해시인지 확인
    if (hash.startsWith('pbkdf2:')) {
      // 새로운 PBKDF2 방식
      const hashData = hash.substring(7) // 'pbkdf2:' 제거
      const hashBytes = new Uint8Array(hashData.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
      const salt = hashBytes.slice(0, 16)
      const storedHash = hashBytes.slice(16)
      
      const encoder = new TextEncoder()
      const passwordBuffer = encoder.encode(password)
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      )
      
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      )
      
      const derivedHash = new Uint8Array(derivedBits)
      
      // 해시 비교 (타이밍 공격 방지)
      if (storedHash.length !== derivedHash.length) return false
      
      let result = 0
      for (let i = 0; i < storedHash.length; i++) {
        result |= storedHash[i] ^ derivedHash[i]
      }
      
      return result === 0
    } else {
      // 레거시 SHA-256 방식 (기존 사용자)
      const hashedInput = await hashPasswordLegacy(password)
      return hashedInput === hash
    }
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

// 회원가입
auth.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    
    if (!email || !password || !name) {
      return c.json({ success: false, message: '모든 필드를 입력해주세요.' }, 400)
    }
    
    // 이메일 중복 확인
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()
    
    if (existingUser) {
      return c.json({ success: false, message: '이미 존재하는 이메일입니다.' }, 400)
    }
    
    // 비밀번호 해시화
    const passwordHash = await hashPassword(password)
    
    // 사용자 생성
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).bind(email, passwordHash, name).run()
    
    if (result.success) {
      return c.json({ 
        success: true, 
        message: '회원가입이 완료되었습니다.',
        user_id: result.meta.last_row_id
      })
    } else {
      return c.json({ success: false, message: '회원가입에 실패했습니다.' }, 500)
    }
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 로그인
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ success: false, message: '이메일과 비밀번호를 입력해주세요.' }, 400)
    }
    
    // 사용자 조회
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, name, is_admin FROM users WHERE email = ?'
    ).bind(email).first()
    
    if (!user) {
      return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 401)
    }
    
    // 비밀번호 확인
    const isValidPassword = await verifyPassword(password, user.password_hash as string)
    
    if (!isValidPassword) {
      return c.json({ success: false, message: '비밀번호가 틀렸습니다.' }, 401)
    }
    
    // JWT 토큰 생성
    const payload = {
      user_id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24시간
    }
    
    const token = await sign(payload, getJwtSecret(c))
    
    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 토큰 검증 미들웨어
export async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: '인증이 필요합니다.' }, 401)
  }
  
  const token = authHeader.substring(7) // "Bearer " 제거
  
  try {
    const payload = await verify(token, getJwtSecret(c))
    c.set('user', payload)
    await next()
  } catch (error) {
    return c.json({ success: false, message: '유효하지 않은 토큰입니다.' }, 401)
  }
}

// 관리자 권한 확인 미들웨어
export async function adminMiddleware(c: any, next: any) {
  const user = c.get('user')
  
  if (!user || !user.is_admin) {
    return c.json({ success: false, message: '관리자 권한이 필요합니다.' }, 403)
  }
  
  await next()
}

// 토큰 검증 엔드포인트
auth.get('/verify', authMiddleware, async (c) => {
  const tokenUser = c.get('user')
  
  // 데이터베이스에서 최신 사용자 정보 조회
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, is_admin FROM users WHERE id = ?'
  ).bind(tokenUser.user_id).first()
  
  if (!user) {
    return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404)
  }
  
  return c.json({ 
    success: true, 
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin
    }
  })
})

export default auth