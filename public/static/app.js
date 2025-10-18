// 메인 페이지 JavaScript
let communityCharts = {}; // 차트 인스턴스 저장

// API 요청은 common.js에서 처리

// 로그인 표시
function showLogin() {
    window.location.href = '/login';
}

// 회원가입 표시
function showRegister() {
    document.getElementById('app').innerHTML = `
        <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">회원가입</h2>
            
            <form id="registerForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <input type="text" id="regName" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input type="email" id="regEmail" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                    <input type="password" id="regPassword" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <button type="submit" class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded">
                    회원가입
                </button>
            </form>
            
            <div class="mt-4 text-center">
                <button onclick="location.reload()" class="text-blue-500 hover:text-blue-600">
                    메인으로 돌아가기
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// 회원가입 처리
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        const result = await window.apiRequest('/api/auth/register', {
            method: 'POST',
            data: { name, email, password }
        });
        
        if (result.success) {
            alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
            showLogin();
        } else {
            alert(result.message || '회원가입에 실패했습니다.');
        }
    } catch (error) {
        alert(error.message || '회원가입 중 오류가 발생했습니다.');
    }
}

// 미션 목록 표시
async function showMissions() {
    try {
        const result = await window.apiRequest('/api/missions');
        
        if (result.success) {
            const missionsList = result.missions.map(mission => `
                <div class="border border-gray-200 rounded-lg p-4 mb-3">
                    <h3 class="font-bold text-lg text-gray-800">${mission.title}</h3>
                    <p class="text-gray-600 text-sm mt-1">${mission.description || ''}</p>
                    <div class="flex justify-between items-center mt-3 text-xs text-gray-500">
                        <span>기간: ${mission.start_date} ~ ${mission.end_date}</span>
                        <button onclick="showMissionDetail(${mission.id})" 
                                class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">
                            상세보기
                        </button>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('app').innerHTML = `
                <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">미션 목록</h2>
                        <button onclick="location.reload()" class="text-blue-500 hover:text-blue-600">
                            메인으로
                        </button>
                    </div>
                    <div class="space-y-3">
                        ${missionsList || '<p class="text-gray-500 text-center">등록된 미션이 없습니다.</p>'}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        alert(error.message || '미션 목록을 불러오는데 실패했습니다.');
    }
}

// 미션 상세 정보 표시
async function showMissionDetail(missionId) {
    try {
        const result = await window.apiRequest(`/api/missions/${missionId}`);
        
        if (result.success) {
            const mission = result.mission;
            document.getElementById('app').innerHTML = `
                <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">${mission.title}</h2>
                        <button onclick="showMissions()" class="text-blue-500 hover:text-blue-600">
                            목록으로
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <h3 class="font-medium text-gray-800 mb-2">설명</h3>
                            <p class="text-gray-600">${mission.description || '설명이 없습니다.'}</p>
                        </div>
                        
                        <div>
                            <h3 class="font-medium text-gray-800 mb-2">진행 기간</h3>
                            <p class="text-gray-600">${mission.start_date} ~ ${mission.end_date}</p>
                        </div>
                        
                        <div>
                            <h3 class="font-medium text-gray-800 mb-2">참여자 수</h3>
                            <p class="text-gray-600">${mission.participant_count}명</p>
                        </div>
                        
                        <div class="pt-4 border-t">
                            <p class="text-sm text-gray-500 mb-3">
                                미션에 참여하려면 로그인이 필요합니다.
                            </p>
                            <button onclick="showLogin()" 
                                    class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
                                로그인하여 참여하기
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        alert(error.message || '미션 정보를 불러오는데 실패했습니다.');
    }
}

// 로그아웃
function logout() {
    window.removeToken();
    window.location.href = '/';
}

// 커뮤니티 통계 로드 (인증 없이)
async function loadCommunityStatistics() {
    try {
        // 토큰 없이도 커뮤니티 통계는 볼 수 있도록 임시 토큰 시도
        const result = await fetch('/api/statistics/community').then(res => res.json()).catch(() => null);
        
        if (result && result.success) {
            const stats = result.statistics;
            
            // 주요 지표 카드 업데이트
            updateCommunityStatsCards(stats);
            
            // 차트 생성
            createMissionParticipationChart(stats.missionParticipation);
            createVerificationStatusChart(stats.verificationStatus);
            createWeeklyTrendChart(stats.weeklyVerifications);
            createTopUsersChart(stats.topUsers);
        } else {
            // 통계를 불러올 수 없을 때 기본 메시지 표시
            document.getElementById('communityStats').innerHTML = 
                '<p class="col-span-4 text-center text-gray-500">통계를 보려면 로그인이 필요합니다.</p>';
        }
    } catch (error) {
        console.error('Error loading community statistics:', error);
        document.getElementById('communityStats').innerHTML = 
            '<p class="col-span-4 text-center text-gray-500">통계를 불러오는데 실패했습니다.</p>';
    }
}

// 주요 지표 카드 업데이트
function updateCommunityStatsCards(stats) {
    const totalMissions = stats.missionParticipation.length;
    const totalUsers = stats.topUsers.length; // 활동 중인 사용자 수
    const totalVerifications = stats.verificationStatus.reduce((sum, s) => sum + s.count, 0);
    const completedVerifications = stats.verificationStatus.find(s => s.verification_status === 'completed')?.count || 0;
    
    document.getElementById('communityStats').innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-600">${totalMissions}</div>
            <div class="text-sm text-gray-600">활성 미션</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-600">${totalUsers}</div>
            <div class="text-sm text-gray-600">활동 회원</div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-purple-600">${totalVerifications}</div>
            <div class="text-sm text-gray-600">총 인증</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-yellow-600">${Math.round(completedVerifications / totalVerifications * 100) || 0}%</div>
            <div class="text-sm text-gray-600">완료율</div>
        </div>
    `;
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
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
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
                legend: {
                    position: 'bottom'
                }
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
    
    // 데이터가 없으면 기본 메시지 표시
    if (!data || data.length === 0) {
        const canvas = ctx;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.font = '16px Arial';
        context.fillStyle = '#6B7280';
        context.textAlign = 'center';
        context.fillText('아직 주간 통계가 없습니다', canvas.width/2, canvas.height/2);
        return;
    }
    
    communityCharts.weeklyTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => {
                const date = new Date(d.week_start);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }),
            datasets: [{
                label: '주간 인증 제출',
                data: data.map(d => d.submissions),
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
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
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
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 페이지 로드시 토큰 확인
document.addEventListener('DOMContentLoaded', function() {
    // 커뮤니티 통계 로드
    loadCommunityStatistics();
    
    const token = window.getToken();
    if (token) {
        // 토큰이 있으면 검증만 하고 리다이렉트 하지 않음
        window.apiRequest('/api/auth/verify')
            .then(result => {
                if (result.success) {
                    console.log('로그인된 사용자:', result.user.name);
                    // 네비게이션 메뉴만 업데이트하고 홈페이지에 머물기
                    if (window.createNavigationMenu) {
                        window.createNavigationMenu();
                    }
                } else {
                    // 토큰이 유효하지 않으면 제거
                    window.removeToken();
                }
            })
            .catch(() => {
                // 토큰이 유효하지 않으면 제거
                window.removeToken();
            });
    }
});