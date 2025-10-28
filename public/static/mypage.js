// 마이페이지 JavaScript  
window.API_BASE = window.API_BASE || '';
let allVerificationsData = [];
let personalCharts = {}; // 차트 인스턴스 저장
let personalStatistics = null; // 개인 통계 데이터

// API 요청 헬퍼
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`;
    }
    
    try {
        const response = await axios({
            url: API_BASE + url,
            headers: { ...defaultHeaders, ...options.headers },
            ...options
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
        }
        throw error.response?.data || { success: false, message: '네트워크 오류가 발생했습니다.' };
    }
}

// 로그아웃
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// 사용자 정보 로드
async function loadUserInfo() {
    try {
        const result = await apiRequest('/api/auth/verify');
        
        if (result.success) {
            const user = result.user;
            const joinDate = new Date(user.exp * 1000 - (24 * 60 * 60 * 1000)); // 대략적인 가입일
            
            document.getElementById('userInfo').innerHTML = `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="text-sm text-gray-600">이름</div>
                    <div class="text-lg font-medium text-gray-800">${user.name || '사용자'}</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <div class="text-sm text-gray-600">이메일</div>
                    <div class="text-lg font-medium text-gray-800">${user.email}</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <div class="text-sm text-gray-600">회원 유형</div>
                    <div class="text-lg font-medium text-gray-800">${user.is_admin ? '관리자' : '일반 회원'}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        document.getElementById('userInfo').innerHTML = 
            '<p class="text-red-500 text-sm col-span-3">사용자 정보를 불러오는데 실패했습니다.</p>';
    }
}

// 미션 통계 로드
async function loadMissionStats() {
    try {
        const [myMissionsResult, allVerificationsResult] = await Promise.all([
            apiRequest('/api/missions/my/list'),
            loadAllMyVerifications() // 전체 인증 데이터를 먼저 로드
        ]);
        
        if (myMissionsResult.success) {
            const missions = myMissionsResult.missions;
            const totalMissions = missions.length;
            const totalVerifications = allVerificationsData.length;
            const completedVerifications = allVerificationsData.filter(v => v.verification_status === 'completed').length;
            const pendingVerifications = allVerificationsData.filter(v => v.verification_status === 'pending').length;
            
            document.getElementById('missionStats').innerHTML = `
                <div class="bg-blue-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-blue-600">${totalMissions}</div>
                    <div class="text-sm text-gray-600">참여 미션</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-600">${completedVerifications}</div>
                    <div class="text-sm text-gray-600">완료 인증</div>
                </div>
                <div class="bg-yellow-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-yellow-600">${pendingVerifications}</div>
                    <div class="text-sm text-gray-600">대기 인증</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-purple-600">${totalVerifications}</div>
                    <div class="text-sm text-gray-600">총 인증</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading mission stats:', error);
        document.getElementById('missionStats').innerHTML = 
            '<p class="text-red-500 text-sm col-span-4">통계를 불러오는데 실패했습니다.</p>';
    }
}

// 참여 중인 미션 로드
async function loadParticipatingMissions() {
    try {
        const result = await apiRequest('/api/missions/my/list');
        
        if (result.success) {
            const missionsHtml = result.missions.map(mission => {
                const progress = mission.verification_count > 0 ? 
                    Math.round((mission.completed_count / mission.verification_count) * 100) : 0;
                
                const startDate = new Date(mission.start_date).toLocaleDateString();
                const endDate = new Date(mission.end_date).toLocaleDateString();
                const isActive = new Date() <= new Date(mission.end_date);
                
                return `
                    <div class="border border-gray-200 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex-1">
                                <h3 class="font-medium text-gray-800 mb-1">${mission.title}</h3>
                                <p class="text-sm text-gray-600 mb-2">${mission.description || ''}</p>
                                <div class="text-xs text-gray-500">
                                    기간: ${startDate} ~ ${endDate}
                                </div>
                            </div>
                            <span class="text-xs px-2 py-1 rounded ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}">
                                ${isActive ? '진행중' : '완료'}
                            </span>
                        </div>
                        
                        <div class="mb-3">
                            <div class="flex justify-between text-sm mb-1">
                                <span>진행률</span>
                                <span>${mission.completed_count}/${mission.verification_count} (${progress}%)</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-500 h-2 rounded-full" style="width: ${progress}%"></div>
                            </div>
                        </div>
                        
                        <div class="flex space-x-2">
                            <button onclick="showMissionVerifications(${mission.id})" 
                                    class="flex-1 text-xs bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200">
                                인증 현황
                            </button>
                            ${isActive ? `
                                <button onclick="showVerificationForm(${mission.id})" 
                                        class="flex-1 text-xs bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">
                                    인증 제출
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('participatingMissions').innerHTML = 
                missionsHtml || '<p class="text-gray-500 text-sm">참여 중인 미션이 없습니다.</p>';
        }
    } catch (error) {
        console.error('Error loading participating missions:', error);
        document.getElementById('participatingMissions').innerHTML = 
            '<p class="text-red-500 text-sm">참여 미션 목록을 불러오는데 실패했습니다.</p>';
    }
}

// 전체 인증 데이터 로드 (내부적으로 사용)
async function loadAllMyVerifications() {
    try {
        // 참여한 모든 미션의 인증 데이터를 수집
        const myMissionsResult = await apiRequest('/api/missions/my/list');
        if (!myMissionsResult.success) return [];
        
        const allVerifications = [];
        for (const mission of myMissionsResult.missions) {
            try {
                const verificationResult = await apiRequest(`/api/missions/${mission.id}/my-verifications`);
                if (verificationResult.success) {
                    verificationResult.verifications.forEach(verification => {
                        allVerifications.push({
                            ...verification,
                            mission_title: mission.title,
                            mission_id: mission.id
                        });
                    });
                }
            } catch (error) {
                console.error(`Error loading verifications for mission ${mission.id}:`, error);
            }
        }
        
        // 제출일 기준으로 정렬 (최신순)
        allVerifications.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
        allVerificationsData = allVerifications;
        return allVerifications;
    } catch (error) {
        console.error('Error loading all verifications:', error);
        return [];
    }
}

// 최근 인증 현황 로드
async function loadRecentVerifications() {
    try {
        // 최근 5개 인증만 표시
        const recentVerifications = allVerificationsData.slice(0, 5);
        
        const verificationsHtml = recentVerifications.map(verification => {
            let statusColor = 'text-yellow-600 bg-yellow-100';
            let statusText = '대기 중';
            
            if (verification.verification_status === 'completed') {
                statusColor = 'text-green-600 bg-green-100';
                statusText = '완료';
            } else if (verification.verification_status === 'needs_review') {
                statusColor = 'text-red-600 bg-red-100';
                statusText = '재검토 필요';
            }
            
            return `
                <div class="border border-gray-200 rounded-lg p-3">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <h4 class="font-medium text-sm text-gray-800">${verification.mission_title}</h4>
                            <a href="${verification.blog_url}" target="_blank" 
                               class="text-xs text-blue-600 hover:text-blue-800 break-all">
                                ${verification.blog_url}
                            </a>
                        </div>
                        <span class="text-xs px-2 py-1 rounded ${statusColor}">
                            ${statusText}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500">
                        제출일: ${new Date(verification.submitted_at).toLocaleDateString()}
                        ${verification.verified_at ? ` | 확인일: ${new Date(verification.verified_at).toLocaleDateString()}` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('recentVerifications').innerHTML = 
            verificationsHtml || '<p class="text-gray-500 text-sm">최근 인증이 없습니다.</p>';
    } catch (error) {
        console.error('Error loading recent verifications:', error);
        document.getElementById('recentVerifications').innerHTML = 
            '<p class="text-red-500 text-sm">최근 인증 현황을 불러오는데 실패했습니다.</p>';
    }
}

// 전체 인증 이력 표시
function displayAllVerifications(verifications = allVerificationsData) {
    const verificationsHtml = verifications.map(verification => {
        let statusColor = 'text-yellow-600 bg-yellow-100';
        let statusText = '대기 중';
        
        if (verification.verification_status === 'completed') {
            statusColor = 'text-green-600 bg-green-100';
            statusText = '완료';
        } else if (verification.verification_status === 'needs_review') {
            statusColor = 'text-red-600 bg-red-100';
            statusText = '재검토 필요';
        }
        
        return `
            <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-800 mb-1">${verification.mission_title}</h4>
                        <a href="${verification.blog_url}" target="_blank" 
                           class="text-sm text-blue-600 hover:text-blue-800 break-all">
                            ${verification.blog_url}
                        </a>
                    </div>
                    <span class="text-sm px-3 py-1 rounded ${statusColor}">
                        ${statusText}
                    </span>
                </div>
                
                <div class="text-sm text-gray-600 mb-2">
                    <div>제출일: ${new Date(verification.submitted_at).toLocaleString()}</div>
                    ${verification.verified_at ? `<div>확인일: ${new Date(verification.verified_at).toLocaleString()}</div>` : ''}
                </div>
                
                ${verification.crawl_result ? `
                    <div class="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>검토 결과:</strong> ${verification.crawl_result}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    document.getElementById('allVerifications').innerHTML = 
        verificationsHtml || '<p class="text-gray-500 text-sm">인증 이력이 없습니다.</p>';
}

// 인증 상태별 필터링
function filterVerifications() {
    const status = document.getElementById('statusFilter').value;
    
    if (status === '') {
        displayAllVerifications(allVerificationsData);
    } else {
        const filtered = allVerificationsData.filter(v => v.verification_status === status);
        displayAllVerifications(filtered);
    }
}

// 미션 인증 현황 모달 (재사용)
async function showMissionVerifications(missionId) {
    try {
        const result = await apiRequest(`/api/missions/${missionId}/my-verifications`);
        
        if (result.success) {
            const verificationsHtml = result.verifications.map(verification => {
                let statusColor = 'text-yellow-600';
                let statusText = '확인 중';
                
                if (verification.verification_status === 'completed') {
                    statusColor = 'text-green-600';
                    statusText = '완료';
                } else if (verification.verification_status === 'needs_review') {
                    statusColor = 'text-red-600';
                    statusText = '재검토 필요';
                }
                
                return `
                    <div class="border border-gray-200 rounded p-3">
                        <div class="flex justify-between items-start mb-2">
                            <a href="${verification.blog_url}" target="_blank" 
                               class="text-blue-600 hover:text-blue-800 text-sm break-all">
                                ${verification.blog_url}
                            </a>
                            <span class="text-xs ${statusColor} font-medium whitespace-nowrap ml-2">
                                ${statusText}
                            </span>
                        </div>
                        <div class="text-xs text-gray-500">
                            제출일: ${new Date(verification.submitted_at).toLocaleDateString()}
                        </div>
                        ${verification.crawl_result ? `
                            <div class="mt-2 text-xs text-gray-600">
                                <strong>결과:</strong> ${verification.crawl_result}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-96 overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-800">인증 현황</h3>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="text-gray-500 hover:text-gray-700">
                            ✕
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        ${verificationsHtml || '<p class="text-gray-500 text-sm">제출한 인증이 없습니다.</p>'}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
    } catch (error) {
        alert(error.message || '인증 현황을 불러오는데 실패했습니다.');
    }
}

// 인증 제출 폼 (재사용)
function showVerificationForm(missionId) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-bold text-gray-800 mb-4">미션 인증 제출</h3>
            
            <form id="verificationForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        블로그 URL
                    </label>
                    <input type="url" id="blogUrl" required 
                           placeholder="https://blog.example.com/my-post"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <p class="text-xs text-gray-500 mt-1">
                        독서 후기나 영성 묵상이 작성된 블로그 포스트 URL을 입력하세요.
                    </p>
                </div>
                
                <div class="flex space-x-3">
                    <button type="submit" 
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                        제출하기
                    </button>
                    <button type="button" onclick="this.closest('.fixed').remove()" 
                            class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded">
                        취소
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('verificationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const blogUrl = document.getElementById('blogUrl').value;
        
        try {
            const result = await apiRequest(`/api/missions/${missionId}/verify`, {
                method: 'POST',
                data: { blog_url: blogUrl }
            });
            
            if (result.success) {
                alert('인증이 제출되었습니다! 확인 후 결과를 알려드리겠습니다.');
                modal.remove();
                // 데이터 새로고침
                await loadAllMyVerifications();
                loadMissionStats();
                loadParticipatingMissions();
                loadRecentVerifications();
                displayAllVerifications();
            } else {
                alert(result.message || '인증 제출에 실패했습니다.');
            }
        } catch (error) {
            alert(error.message || '인증 제출 중 오류가 발생했습니다.');
        }
    });
    
    // 모달 외부 클릭시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 개인 통계 로드
async function loadPersonalStatistics() {
    try {
        const result = await apiRequest('/api/statistics/personal');
        
        if (result.success) {
            personalStatistics = result.statistics;
            
            // 차트 생성
            createMonthlyActivityChart(personalStatistics.monthlyVerifications);
            createCategoryChart(personalStatistics.categoryActivity);
            createSuccessRateChart(personalStatistics.weeklyProgress);
            createMissionProgressChart(personalStatistics.personalMissions);
        }
    } catch (error) {
        console.error('Error loading personal statistics:', error);
    }
}

// 월별 인증 활동 차트
function createMonthlyActivityChart(data) {
    const ctx = document.getElementById('monthlyActivityChart').getContext('2d');
    
    if (personalCharts.monthlyActivity) {
        personalCharts.monthlyActivity.destroy();
    }
    
    personalCharts.monthlyActivity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.month).reverse(),
            datasets: [
                {
                    label: '총 제출',
                    data: data.map(d => d.submissions).reverse(),
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1
                },
                {
                    label: '완료',
                    data: data.map(d => d.completed).reverse(),
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
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

// 카테고리별 활동 차트
function createCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (personalCharts.category) {
        personalCharts.category.destroy();
    }
    
    personalCharts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.category),
            datasets: [{
                data: data.map(d => d.missions_count),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',  // 파랑
                    'rgba(16, 185, 129, 0.8)',  // 초록
                    'rgba(251, 191, 36, 0.8)',  // 노랑
                    'rgba(147, 51, 234, 0.8)',  // 보라
                    'rgba(239, 68, 68, 0.8)'    // 빨강
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

// 주간 성공률 추이 차트
function createSuccessRateChart(data) {
    const ctx = document.getElementById('successRateChart').getContext('2d');
    
    if (personalCharts.successRate) {
        personalCharts.successRate.destroy();
    }
    
    personalCharts.successRate = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => {
                const date = new Date(d.week_start);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }),
            datasets: [{
                label: '성공률 (%)',
                data: data.map(d => d.success_rate),
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// 미션별 진행 현황 차트
function createMissionProgressChart(data) {
    const ctx = document.getElementById('missionProgressChart').getContext('2d');
    
    if (personalCharts.missionProgress) {
        personalCharts.missionProgress.destroy();
    }
    
    const chartData = data.slice(0, 5); // 최근 5개 미션만
    
    personalCharts.missionProgress = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(m => m.title.length > 15 ? m.title.substring(0, 15) + '...' : m.title),
            datasets: [
                {
                    label: '완료',
                    data: chartData.map(m => m.completed_verifications),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                },
                {
                    label: '대기',
                    data: chartData.map(m => m.pending_verifications),
                    backgroundColor: 'rgba(251, 191, 36, 0.8)',
                    borderColor: 'rgba(251, 191, 36, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    stacked: true
                }
            }
        }
    });
}

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', async function() {
    // 토큰 확인
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    // 토큰 유효성 검증 및 데이터 로드
    try {
        const result = await apiRequest('/api/auth/verify');
        
        // result가 null이면 토큰이 이미 common.js에서 삭제됨
        if (!result || !result.success) {
            console.log('토큰 검증 실패 - 홈으로 리다이렉트');
            window.location.href = '/';
            return;
        }
        
        if (result.user.is_admin) {
            // 관리자는 관리자 페이지로 리다이렉트
            window.location.href = '/admin';
            return;
        }
        
        // 사용자 데이터 순차적으로 로드
        await loadUserInfo();
        await loadAllMyVerifications(); // 전체 인증 데이터 먼저 로드
        await loadMissionStats();
        await loadPersonalStatistics(); // 개인 통계 로드
        await loadParticipatingMissions();
        await loadRecentVerifications();
        displayAllVerifications();
    } catch (error) {
        // 네트워크 오류 등 예외 상황 - 토큰은 유지하고 재시도 가능하도록
        console.error('페이지 로드 오류:', error);
        alert('네트워크 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    }
});