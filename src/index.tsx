import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// 미들웨어 설정
app.use('*', logger())
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains'
}))
app.use('/api/*', cors())

// 정적 파일 서빙 (public 폴더의 static 파일들)
// @ts-ignore - Cloudflare Workers 환경에서는 manifest가 선택적임
app.use('/static/*', serveStatic({ root: './public' }))

// 렌더러 미들웨어
app.use(renderer)

// API 라우트들
import authRoutes from './routes/auth'
import missionRoutes from './routes/missions'
import adminRoutes from './routes/admin'
import statisticsRoutes from './routes/statistics'

app.route('/api/auth', authRoutes)
app.route('/api/missions', missionRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/statistics', statisticsRoutes)

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>독서/영성 커뮤니티</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- 네비게이션 바 -->
        <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-xl font-bold text-gray-800">독서/영성 커뮤니티</h1>
                    <div id="navigationMenu" class="flex space-x-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="container mx-auto px-4 py-8">
            <header class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">독서/영성 커뮤니티</h1>
                <p class="text-gray-600">함께 성장하는 독서와 영성 생활</p>
            </header>
            
            <!-- 커뮤니티 현황 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-6">커뮤니티 현황</h2>
                
                <!-- 주요 지표 카드 -->
                <div id="communityStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <!-- 동적으로 로드됨 -->
                </div>
                
                <!-- 차트 그리드 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- 미션별 참여율 차트 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">미션별 참여현황</h3>
                        <div class="h-60">
                            <canvas id="missionParticipationChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 인증 상태 분포 차트 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">인증 상태 분포</h3>
                        <div class="h-60">
                            <canvas id="verificationStatusChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 주간 활동 트렌드 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">주간 인증 제출 트렌드</h3>
                        <div class="h-60">
                            <canvas id="weeklyTrendChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 상위 활동 사용자 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">활발한 참여자 TOP 5</h3>
                        <div class="h-60">
                            <canvas id="topUsersChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 환영 메시지 -->
            <div class="bg-white rounded-lg shadow-md p-8 text-center">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">독서와 영성으로 함께 성장하세요!</h2>
                <p class="text-gray-600 mb-6">다양한 독서/영성 미션에 참여하고 서로 격려하는 따뜻한 커뮤니티입니다.</p>
                
                <div class="flex justify-center space-x-4">
                    <button 
                        data-page="about" 
                        class="action-button bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
                        onclick="if(window.goToPage) window.goToPage('about'); else window.location.href='/about';">
                        커뮤니티 소개 보기
                    </button>
                    <button 
                        data-page="register" 
                        class="action-button bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium"
                        onclick="if(window.goToPage) window.goToPage('register'); else window.location.href='/register';">
                        지금 시작하기
                    </button>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/common.js"></script>
        <script src="/static/navigation.js"></script>
        <script>
// 커뮤니티 통계 로드
let communityCharts = {}; // 차트 인스턴스 저장

async function loadCommunityStats() {
    console.log('Loading community statistics...');
    const communityStatsElement = document.getElementById('communityStats');
    
    if (communityStatsElement) {
        communityStatsElement.innerHTML = '<p class="col-span-4 text-center text-gray-500">통계 로딩 중...</p>';
    }
    
    try {
        const response = await fetch('/api/statistics/community');
        const result = await response.json();
        
        if (result && result.success && result.statistics) {
            const stats = result.statistics;
            const totalMissions = stats.missionParticipation ? stats.missionParticipation.length : 0;
            const totalUsers = stats.topUsers ? stats.topUsers.length : 0; // 활동 중인 사용자 수
            const totalVerifications = stats.verificationStatus ? 
                stats.verificationStatus.reduce((sum, s) => sum + (s.count || 0), 0) : 0;
            const completedVerifications = stats.verificationStatus ? 
                (stats.verificationStatus.find(s => s.verification_status === 'completed')?.count || 0) : 0;
            
            if (communityStatsElement) {
                communityStatsElement.innerHTML = \`
                    <div class="bg-blue-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600">\${totalMissions}</div>
                        <div class="text-sm text-gray-600">활성 미션</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600">\${totalUsers}</div>
                        <div class="text-sm text-gray-600">활동 회원</div>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-600">\${totalVerifications}</div>
                        <div class="text-sm text-gray-600">총 인증</div>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-yellow-600">\${totalVerifications > 0 ? Math.round(completedVerifications / totalVerifications * 100) : 0}%</div>
                        <div class="text-sm text-gray-600">완료율</div>
                    </div>
                \`;
            }
            
            // 차트 생성
            createCharts(stats);
        } else {
            if (communityStatsElement) {
                communityStatsElement.innerHTML = \`
                    <div class="col-span-4 text-center bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p class="text-yellow-700">통계 데이터를 불러올 수 없습니다.</p>
                        <button onclick="loadCommunityStats()" class="mt-2 text-yellow-800 underline hover:no-underline">
                            다시 시도
                        </button>
                    </div>
                \`;
            }
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        if (communityStatsElement) {
            communityStatsElement.innerHTML = \`
                <div class="col-span-4 text-center bg-red-50 border border-red-200 rounded-lg p-4">
                    <p class="text-red-600">통계를 불러오는데 실패했습니다.</p>
                    <button onclick="loadCommunityStats()" class="mt-2 text-red-800 underline hover:no-underline">
                        다시 시도
                    </button>
                </div>
            \`;
        }
    }
}

// 모든 차트 생성
function createCharts(stats) {
    if (!stats) return;
    
    // 미션별 참여현황 차트
    if (stats.missionParticipation && stats.missionParticipation.length > 0) {
        createMissionParticipationChart(stats.missionParticipation);
    }
    
    // 인증 상태 분포 차트
    if (stats.verificationStatus && stats.verificationStatus.length > 0) {
        createVerificationStatusChart(stats.verificationStatus);
    }
    
    // 주간 트렌드 차트
    if (stats.weeklyVerifications && stats.weeklyVerifications.length > 0) {
        createWeeklyTrendChart(stats.weeklyVerifications);
    }
    
    // TOP 사용자 차트
    if (stats.topUsers && stats.topUsers.length > 0) {
        createTopUsersChart(stats.topUsers);
    }
}

// 미션별 참여현황 차트
function createMissionParticipationChart(data) {
    const ctx = document.getElementById('missionParticipationChart');
    if (!ctx) return;
    
    if (communityCharts.missionParticipation) {
        communityCharts.missionParticipation.destroy();
    }
    
    const chartData = data.slice(0, 5);
    
    communityCharts.missionParticipation = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(m => m.title.length > 15 ? m.title.substring(0, 15) + '...' : m.title),
            datasets: [{
                label: '참여자 수',
                data: chartData.map(m => m.participants),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// 인증 상태 분포 차트
function createVerificationStatusChart(data) {
    const ctx = document.getElementById('verificationStatusChart');
    if (!ctx) return;
    
    if (communityCharts.verificationStatus) {
        communityCharts.verificationStatus.destroy();
    }
    
    const statusLabels = {
        'pending': '대기 중',
        'completed': '완료',
        'needs_review': '재검토 필요'
    };
    
    communityCharts.verificationStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => statusLabels[d.verification_status] || d.verification_status),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: [
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// 주간 인증 트렌드 차트
function createWeeklyTrendChart(data) {
    const ctx = document.getElementById('weeklyTrendChart');
    if (!ctx) return;
    
    if (communityCharts.weeklyTrend) {
        communityCharts.weeklyTrend.destroy();
    }
    
    communityCharts.weeklyTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => {
                const date = new Date(d.week_start);
                return \`\${date.getMonth() + 1}/\${date.getDate()}\`;
            }).reverse(),
            datasets: [{
                label: '주간 인증 제출',
                data: data.map(d => d.submissions).reverse(),
                borderColor: 'rgba(147, 51, 234, 1)',
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// 상위 활동 사용자 차트
function createTopUsersChart(data) {
    const ctx = document.getElementById('topUsersChart');
    if (!ctx) return;
    
    if (communityCharts.topUsers) {
        communityCharts.topUsers.destroy();
    }
    
    const topFive = data.slice(0, 5);
    
    communityCharts.topUsers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topFive.map(u => u.name),
            datasets: [{
                label: '완료 인증',
                data: topFive.map(u => u.completed_verifications),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}
        </script>
        <script>
            // 메인 페이지 초기화
            document.addEventListener('DOMContentLoaded', async function() {
                console.log('Main page DOMContentLoaded');
                
                // 네비게이션 메뉴 생성
                if (window.createNavigationMenu) {
                    await window.createNavigationMenu();
                }
                
                // 커뮤니티 통계 로드
                loadCommunityStats();
                
                // 액션 버튼 초기화
                setTimeout(function() {
                    if (window.initializeActionButtons) {
                        window.initializeActionButtons();
                    }
                }, 100);
            });
        </script>
    </body>
    </html>
  `)
})

// 로그인 페이지
app.get('/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>로그인 - 독서/영성 커뮤니티</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- 네비게이션 바 -->
        <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-xl font-bold text-gray-800">독서/영성 커뮤니티</h1>
                    <div id="navigationMenu" class="flex space-x-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">로그인</h2>
            
            <form id="loginForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input type="email" id="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                    <input type="password" id="password" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
                    로그인
                </button>
            </form>
            
            <div class="mt-4 text-center">
                <button onclick="window.goToPage('home')" class="text-blue-500 hover:text-blue-600">메인으로 돌아가기</button>
            </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/common.js"></script>
        <script src="/static/navigation.js"></script>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                try {
                    const response = await axios.post('/api/auth/login', {
                        email,
                        password
                    });
                    
                    if (response.data.success) {
                        localStorage.setItem('token', response.data.token);
                        if (response.data.user.is_admin) {
                            window.location.href = '/admin';
                        } else {
                            window.location.href = '/dashboard';
                        }
                    }
                } catch (error) {
                    alert('로그인에 실패했습니다.');
                }
            });
            
            // 페이지 로드 시 네비게이션 메뉴 생성
            document.addEventListener('DOMContentLoaded', async function() {
                try {
                    if (window.createNavigationMenu) {
                        await window.createNavigationMenu();
                    }
                } catch (error) {
                    console.error('Navigation menu creation error:', error);
                }
            });
        </script>
    </body>
    </html>
  `)
})

// 회원가입 페이지
app.get('/register', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>회원가입 - 독서/영성 커뮤니티</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- 네비게이션 바 -->
        <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-xl font-bold text-gray-800">독서/영성 커뮤니티</h1>
                    <div id="navigationMenu" class="flex space-x-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">회원가입</h2>
            
            <form id="registerForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <input type="text" id="name" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input type="email" id="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                    <input type="password" id="password" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                    <input type="password" id="confirmPassword" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <button type="submit" class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded">
                    회원가입
                </button>
            </form>
            
            <div class="mt-4 text-center">
                <button onclick="goToPage('login')" class="text-blue-500 hover:text-blue-600">이미 계정이 있으신가요? 로그인</button>
            </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/common.js"></script>
        <script src="/static/navigation.js"></script>
        <script>
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = document.getElementById('name').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                if (password !== confirmPassword) {
                    alert('비밀번호가 일치하지 않습니다.');
                    return;
                }
                
                try {
                    const response = await axios.post('/api/auth/register', {
                        name,
                        email,
                        password
                    });
                    
                    if (response.data.success) {
                        alert('회원가입이 완료되었습니다. 로그인해주세요.');
                        window.goToPage('login');
                    }
                } catch (error) {
                    alert('회원가입에 실패했습니다. ' + (error.response?.data?.message || ''));
                }
            });
            
            // 페이지 로드 시 네비게이션 메뉴 생성
            document.addEventListener('DOMContentLoaded', async function() {
                try {
                    if (window.createNavigationMenu) {
                        await window.createNavigationMenu();
                    }
                } catch (error) {
                    console.error('Navigation menu creation error:', error);
                }
            });
        </script>
    </body>
    </html>
  `)
})

// 대시보드 (사용자)
app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>대시보드 - 독서/영성 커뮤니티</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- 네비게이션 바 -->
        <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-xl font-bold text-gray-800">독서/영성 커뮤니티</h1>
                    <div id="navigationMenu" class="flex space-x-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="container mx-auto px-4 py-8">
            <header class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">나의 대시보드</h1>
                <p class="text-gray-600">내 활동 현황과 참여 중인 미션을 확인하세요</p>
            </header>
            
            <!-- 내 활동 현황 -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <!-- 참여 중인 미션 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-lg font-bold text-gray-800 mb-4">내 참여 미션</h2>
                    <div id="myMissions" class="space-y-3">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
                
                <!-- 전체 미션 목록 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-lg font-bold text-gray-800 mb-4">참여 가능한 미션</h2>
                    <div id="allMissions" class="space-y-3">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/common.js"></script>
        <script src="/static/navigation.js"></script>
        <script src="/static/dashboard.js"></script>
        <script>
            // 페이지 로드 시 네비게이션 메뉴 생성
            document.addEventListener('DOMContentLoaded', async function() {
                try {
                    if (window.createNavigationMenu) {
                        await window.createNavigationMenu();
                    }
                } catch (error) {
                    console.error('Navigation menu creation error:', error);
                }
            });
        </script>
    </body>
    </html>
  `)
})

// 커뮤니티 소개 페이지
app.get('/about', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>커뮤니티 소개 - 독서/영성 커뮤니티</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- 네비게이션 바 -->
        <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-xl font-bold text-gray-800">독서/영성 커뮤니티</h1>
                    <div id="navigationMenu" class="flex space-x-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="container mx-auto px-4 py-8">
            <!-- 히어로 섹션 -->
            <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-8 mb-8">
                <div class="text-center">
                    <h2 class="text-4xl font-bold mb-4">함께 성장하는 독서와 영성 생활</h2>
                    <p class="text-xl mb-6">독서와 영성을 통해 내면의 성장을 추구하는 따뜻한 커뮤니티입니다</p>
                    <button onclick="goToPage('register')" class="bg-white text-blue-600 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
                        지금 시작하기
                    </button>
                </div>
            </div>
            
            <!-- 커뮤니티 소개 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-2xl font-bold text-gray-800 mb-4">우리 커뮤니티는</h3>
                    <div class="space-y-4">
                        <div class="flex items-start space-x-3">
                            <div class="bg-blue-100 p-2 rounded-full">
                                <span class="text-blue-600 font-bold">📚</span>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-800">독서를 통한 성장</h4>
                                <p class="text-gray-600 text-sm">다양한 독서 챌린지를 통해 꾸준한 독서 습관을 형성하고 지식을 확장합니다.</p>
                            </div>
                        </div>
                        
                        <div class="flex items-start space-x-3">
                            <div class="bg-green-100 p-2 rounded-full">
                                <span class="text-green-600 font-bold">🙏</span>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-800">영성 생활 나눔</h4>
                                <p class="text-gray-600 text-sm">묵상과 기도를 통한 영적 성장의 여정을 함께 걸어갑니다.</p>
                            </div>
                        </div>
                        
                        <div class="flex items-start space-x-3">
                            <div class="bg-purple-100 p-2 rounded-full">
                                <span class="text-purple-600 font-bold">🤝</span>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-800">서로 격려하는 공동체</h4>
                                <p class="text-gray-600 text-sm">각자의 성장 과정을 인증하고 서로 응원하는 따뜻한 공동체입니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-2xl font-bold text-gray-800 mb-4">참여 방법</h3>
                    <div class="space-y-4">
                        <div class="border-l-4 border-blue-500 pl-4">
                            <h4 class="font-semibold text-gray-800">1단계: 회원가입</h4>
                            <p class="text-gray-600 text-sm">간단한 정보로 커뮤니티에 가입하세요.</p>
                        </div>
                        
                        <div class="border-l-4 border-green-500 pl-4">
                            <h4 class="font-semibold text-gray-800">2단계: 미션 선택</h4>
                            <p class="text-gray-600 text-sm">관심 있는 독서/영성 미션을 선택하여 참여하세요.</p>
                        </div>
                        
                        <div class="border-l-4 border-purple-500 pl-4">
                            <h4 class="font-semibold text-gray-800">3단계: 활동 인증</h4>
                            <p class="text-gray-600 text-sm">블로그나 개인 기록을 통해 활동을 인증하고 공유하세요.</p>
                        </div>
                        
                        <div class="border-l-4 border-yellow-500 pl-4">
                            <h4 class="font-semibold text-gray-800">4단계: 함께 성장</h4>
                            <p class="text-gray-600 text-sm">다른 멤버들과 함께 성장하는 기쁨을 누리세요.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 주요 기능 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 class="text-2xl font-bold text-gray-800 mb-6 text-center">주요 기능</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="text-center">
                        <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="text-2xl font-bold text-blue-600">미션</span>
                        </div>
                        <h4 class="font-semibold text-gray-800 mb-2">미션 관리</h4>
                        <p class="text-gray-600 text-sm">다양한 독서/영성 미션에 참여하고 진행 상황을 관리할 수 있습니다.</p>
                    </div>
                    
                    <div class="text-center">
                        <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="text-2xl font-bold text-green-600">인증</span>
                        </div>
                        <h4 class="font-semibold text-gray-800 mb-2">활동 인증</h4>
                        <p class="text-gray-600 text-sm">블로그 URL을 통해 읽은 책이나 묵상 내용을 쉽게 인증할 수 있습니다.</p>
                    </div>
                    
                    <div class="text-center">
                        <div class="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="text-2xl font-bold text-purple-600">통계</span>
                        </div>
                        <h4 class="font-semibold text-gray-800 mb-2">성장 추적</h4>
                        <p class="text-gray-600 text-sm">개인의 활동 내역과 성장 과정을 시각적으로 확인할 수 있습니다.</p>
                    </div>
                </div>
            </div>
            
            <!-- 커뮤니티 현황 (간략) -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-2xl font-bold text-gray-800 mb-6 text-center">현재 커뮤니티 현황</h3>
                <div id="communityQuickStats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <!-- 동적으로 로드됨 -->
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
// 공통 JavaScript 함수들
window.API_BASE = '';

// 페이지 이동 함수
window.goToPage = function(page) {
    console.log('goToPage called with:', page);
    
    const routes = {
        'home': '/',
        'about': '/about',
        'login': '/login',
        'register': '/register',
        'dashboard': '/dashboard',
        'mypage': '/mypage',
        'admin': '/admin'
    };
    
    const url = routes[page] || '/';
    console.log('Navigating to:', url);
    window.location.href = url;
};

// 커뮤니티 간략 통계 로드 (소개 페이지용)
async function loadCommunityQuickStats() {
    console.log('Loading community quick stats...');
    const quickStatsElement = document.getElementById('communityQuickStats');
    
    if (!quickStatsElement) {
        console.log('communityQuickStats element not found');
        return;
    }
    
    quickStatsElement.innerHTML = '<p class="col-span-4 text-center text-gray-500">통계 로딩 중...</p>';
    
    try {
        const response = await fetch('/api/statistics/community');
        console.log('Quick stats API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        const result = await response.json();
        console.log('Quick stats result:', result);
        
        if (result && result.success && result.statistics) {
            const stats = result.statistics;
            const totalMissions = stats.missionParticipation ? stats.missionParticipation.length : 0;
            const totalUsers = stats.topUsers ? stats.topUsers.length : 0;
            const totalVerifications = stats.verificationStatus ? 
                stats.verificationStatus.reduce((sum, s) => sum + (s.count || 0), 0) : 0;
            const completedVerifications = stats.verificationStatus ? 
                (stats.verificationStatus.find(s => s.verification_status === 'completed')?.count || 0) : 0;
            
            quickStatsElement.innerHTML = \`
                <div class="bg-blue-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-blue-600">\${totalMissions}</div>
                    <div class="text-sm text-gray-600">진행 중인 미션</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-green-600">\${totalUsers}</div>
                    <div class="text-sm text-gray-600">활동 중인 멤버</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-purple-600">\${totalVerifications}</div>
                    <div class="text-sm text-gray-600">누적 인증</div>
                </div>
                <div class="bg-yellow-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-yellow-600">\${totalVerifications > 0 ? Math.round(completedVerifications / totalVerifications * 100) : 0}%</div>
                    <div class="text-sm text-gray-600">완료율</div>
                </div>
            \`;
        } else {
            console.error('Invalid quick stats response:', result);
            quickStatsElement.innerHTML = \`
                <div class="col-span-4 text-center bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-700">통계 데이터를 불러올 수 없습니다.</p>
                    <button onclick="loadCommunityQuickStats()" class="mt-2 text-yellow-800 underline hover:no-underline">
                        다시 시도
                    </button>
                </div>
            \`;
        }
    } catch (error) {
        console.error('Error loading community quick stats:', error);
        quickStatsElement.innerHTML = \`
            <div class="col-span-4 text-center bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-600">통계를 불러오는데 실패했습니다: \${error.message}</p>
                <button onclick="loadCommunityQuickStats()" class="mt-2 text-red-800 underline hover:no-underline">
                    다시 시도
                </button>
            </div>
        \`;
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('About page DOMContentLoaded');
    
    // 커뮤니티 간략 통계 로드
    loadCommunityQuickStats();
});
        </script>
    </body>
    </html>
  `)
})

// 마이페이지 (사용자 개인 페이지)
app.get('/mypage', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>마이페이지 - 독서/영성 커뮤니티</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- 네비게이션 바 -->
        <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-xl font-bold text-gray-800">독서/영성 커뮤니티</h1>
                    <div id="navigationMenu" class="flex space-x-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="container mx-auto px-4 py-8">
            <header class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">마이페이지</h1>
                <p class="text-gray-600">개인 활동 현황과 통계를 확인하세요</p>
            </header>
            
            <!-- 사용자 정보 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 class="text-xl font-bold text-gray-800 mb-4">내 정보</h2>
                <div id="userInfo" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- 동적으로 로드됨 -->
                </div>
            </div>
            
            <!-- 개인 활동 통계 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 class="text-xl font-bold text-gray-800 mb-6">나의 활동 분석</h2>
                
                <!-- 주요 지표 -->
                <div id="missionStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <!-- 동적으로 로드됨 -->
                </div>
                
                <!-- 시각화 차트 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- 월별 인증 활동 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">월별 인증 활동</h3>
                        <div class="h-60">
                            <canvas id="monthlyActivityChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 카테고리별 참여 현황 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">관심 분야별 활동</h3>
                        <div class="h-60">
                            <canvas id="categoryChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 주간 성공률 추이 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">주간 인증 성공률</h3>
                        <div class="h-60">
                            <canvas id="successRateChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 미션별 진행 현황 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">미션별 완료도</h3>
                        <div class="h-60">
                            <canvas id="missionProgressChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <!-- 참여 중인 미션 목록 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-lg font-bold text-gray-800 mb-4">참여 중인 미션</h2>
                    <div id="participatingMissions" class="space-y-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
                
                <!-- 최근 인증 현황 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-lg font-bold text-gray-800 mb-4">최근 인증 현황</h2>
                    <div id="recentVerifications" class="space-y-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
            
            <!-- 전체 인증 이력 -->
            <div class="bg-white rounded-lg shadow-md p-6 mt-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-bold text-gray-800">전체 인증 이력</h2>
                    <select id="statusFilter" onchange="filterVerifications()" 
                            class="px-3 py-1 border border-gray-300 rounded text-sm">
                        <option value="">전체</option>
                        <option value="pending">대기 중</option>
                        <option value="completed">완료</option>
                        <option value="needs_review">재검토 필요</option>
                    </select>
                </div>
                <div id="allVerifications" class="space-y-3">
                    <!-- 동적으로 로드됨 -->
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/navigation.js"></script>
        <script src="/static/mypage.js"></script>
        <script>
            // 페이지 로드 시 네비게이션 메뉴 생성
            document.addEventListener('DOMContentLoaded', async function() {
                try {
                    if (window.createNavigationMenu) {
                        await window.createNavigationMenu();
                    }
                } catch (error) {
                    console.error('Navigation menu creation error:', error);
                }
            });
        </script>
    </body>
    </html>
  `)
})

// 관리자 페이지
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>관리자 페이지 - 독서/영성 커뮤니티</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- 네비게이션 바 -->
        <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-xl font-bold text-gray-800">독서/영성 커뮤니티</h1>
                    <div id="navigationMenu" class="flex space-x-4">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="container mx-auto px-4 py-8">
            <header class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">관리자 페이지</h1>
                <p class="text-gray-600">커뮤니티 전체 현황과 미션 관리</p>
            </header>
            
            <!-- 관리자 대시보드 통계 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 class="text-xl font-bold text-gray-800 mb-6">관리자 대시보드</h2>
                
                <!-- 주요 지표 카드 -->
                <div id="adminStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <!-- 동적으로 로드됨 -->
                </div>
                
                <!-- 관리자 차트 그리드 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- 미션별 참여율 및 완료율 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">미션 성과 분석</h3>
                        <div class="h-60">
                            <canvas id="adminMissionChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 사용자 활동 분포 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">사용자 활동 분포</h3>
                        <div class="h-60">
                            <canvas id="adminUserActivityChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 월별 가입자 및 활동 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">월별 커뮤니티 성장</h3>
                        <div class="h-60">
                            <canvas id="adminGrowthChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 인증 처리 현황 -->
                    <div class="bg-gray-50 p-4 rounded-lg h-80">
                        <h3 class="text-md font-semibold text-gray-800 mb-3">인증 처리 현황</h3>
                        <div class="h-60">
                            <canvas id="adminVerificationChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 관리 메뉴 탭 -->
            <div class="bg-white rounded-lg shadow-md mb-6">
                <div class="border-b border-gray-200">
                    <nav class="flex">
                        <button onclick="showMissionsManagement()" 
                                class="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300" 
                                id="missionsTab">
                            미션 관리
                        </button>
                        <button onclick="showParticipantStats()" 
                                class="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300" 
                                id="participantsTab">
                            참여자 현황
                        </button>
                        <button onclick="showReviewsManagement()" 
                                class="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300" 
                                id="reviewsTab">
                            후기글 관리
                        </button>
                    </nav>
                </div>
                <div id="content" class="p-6">
                    <!-- 탭 내용이 여기에 동적으로 로드됨 -->
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/common.js"></script>
        <script src="/static/navigation.js"></script>
        <script src="/static/admin.js"></script>
        <script>
            // 페이지 로드 시 네비게이션 메뉴 생성
            document.addEventListener('DOMContentLoaded', async function() {
                try {
                    if (window.createNavigationMenu) {
                        await window.createNavigationMenu();
                    }
                } catch (error) {
                    console.error('Navigation menu creation error:', error);
                }
            });
        </script>
    </body>
    </html>
  `)
})

// favicon.ico 요청 처리 (404 대신 빈 응답 반환)
app.get('/favicon.ico', (c) => {
  return new Response('', { 
    status: 204,
    headers: {
      'Cache-Control': 'public, max-age=86400'
    }
  });
})

export default app
