// 사용자 대시보드 JavaScript
window.API_BASE = window.API_BASE || '';
let communityCharts = {}; // 차트 인스턴스 저장

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
        console.log('API 요청:', API_BASE + url, { headers: defaultHeaders, ...options });
        const response = await axios({
            url: API_BASE + url,
            headers: { ...defaultHeaders, ...options.headers },
            ...options
        });
        console.log('API 응답:', response.data);
        return response.data;
    } catch (error) {
        console.error('API 오류:', error);
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

// 내 미션 목록 로드
async function loadMyMissions() {
    console.log('loadMyMissions 시작');
    try {
        const result = await apiRequest('/api/missions/my/list');
        console.log('내 미션 데이터:', result);
        
        if (result.success) {
            console.log('미션 개수:', result.missions.length);
            const myMissionsHtml = result.missions.map(mission => `
                <div class="border border-gray-200 rounded-lg p-4">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-medium text-gray-800">${mission.title}</h3>
                        <button onclick="showMissionVerifications(${mission.id})" 
                                class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                            인증현황
                        </button>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">${mission.description || ''}</p>
                    <div class="text-xs text-gray-500 mb-3">
                        기간: ${mission.start_date} ~ ${mission.end_date}
                    </div>
                    <div class="flex justify-between items-center">
                        <div class="text-xs">
                            <span class="text-green-600">완료: ${mission.completed_count}</span> / 
                            <span class="text-gray-600">총: ${mission.verification_count}</span>
                        </div>
                        <button onclick="showVerificationForm(${mission.id})" 
                                class="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded">
                            인증 제출
                        </button>
                    </div>
                </div>
            `).join('');
            
            const myMissionsElement = document.getElementById('myMissions');
            console.log('myMissions 엘리먼트:', myMissionsElement);
            if (myMissionsElement) {
                myMissionsElement.innerHTML = myMissionsHtml || '<p class="text-gray-500 text-sm">참여 중인 미션이 없습니다.</p>';
                console.log('내 미션 HTML 업데이트 완료');
            } else {
                console.error('myMissions 엘리먼트를 찾을 수 없습니다!');
            }
        } else {
            console.error('API 응답 실패:', result);
        }
    } catch (error) {
        console.error('Error loading my missions:', error);
        const myMissionsElement = document.getElementById('myMissions');
        if (myMissionsElement) {
            myMissionsElement.innerHTML = '<p class="text-red-500 text-sm">미션 목록을 불러오는데 실패했습니다.</p>';
        }
    }
}

// 전체 미션 목록 로드
async function loadAllMissions() {
    console.log('loadAllMissions 시작');
    try {
        const result = await apiRequest('/api/missions');
        console.log('전체 미션 데이터:', result);
        
        if (result.success) {
            const allMissionsHtml = result.missions.map(mission => `
                <div class="border border-gray-200 rounded-lg p-4">
                    <h3 class="font-medium text-gray-800 mb-2">${mission.title}</h3>
                    <p class="text-sm text-gray-600 mb-2">${mission.description || ''}</p>
                    <div class="text-xs text-gray-500 mb-3">
                        기간: ${mission.start_date} ~ ${mission.end_date}
                    </div>
                    <div class="flex justify-between items-center">
                        <button onclick="showMissionDetail(${mission.id})" 
                                class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            상세보기
                        </button>
                        <button onclick="joinMission(${mission.id})" 
                                class="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded">
                            참여하기
                        </button>
                    </div>
                </div>
            `).join('');
            
            const allMissionsElement = document.getElementById('allMissions');
            console.log('allMissions 엘리먼트:', allMissionsElement);
            if (allMissionsElement) {
                allMissionsElement.innerHTML = allMissionsHtml || '<p class="text-gray-500 text-sm">등록된 미션이 없습니다.</p>';
                console.log('전체 미션 HTML 업데이트 완료');
            } else {
                console.error('allMissions 엘리먼트를 찾을 수 없습니다!');
            }
        } else {
            console.error('API 응답 실패:', result);
        }
    } catch (error) {
        console.error('Error loading all missions:', error);
        const allMissionsElement = document.getElementById('allMissions');
        if (allMissionsElement) {
            allMissionsElement.innerHTML = '<p class="text-red-500 text-sm">미션 목록을 불러오는데 실패했습니다.</p>';
        }
    }
}

// 미션 참여
async function joinMission(missionId) {
    try {
        const result = await apiRequest(`/api/missions/${missionId}/join`, {
            method: 'POST'
        });
        
        if (result.success) {
            alert('미션 참여가 완료되었습니다!');
            loadMyMissions();
            loadAllMissions();
        } else {
            alert(result.message || '미션 참여에 실패했습니다.');
        }
    } catch (error) {
        alert(error.message || '미션 참여 중 오류가 발생했습니다.');
    }
}

// 인증 제출 폼 표시
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
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        짧은 후기 <span class="text-gray-500">(선택사항, 150자 이내)</span>
                    </label>
                    <textarea id="reviewText" 
                              placeholder="이번 독서/묵상을 통해 느낀 점이나 배운 점을 간단히 적어주세요..."
                              maxlength="150"
                              rows="3"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                        <span>다른 멤버들과 나누고 싶은 소감을 자유롭게 작성해주세요.</span>
                        <span id="charCount">0/150</span>
                    </div>
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
        const reviewText = document.getElementById('reviewText').value;
        
        try {
            const result = await apiRequest(`/api/missions/${missionId}/verify`, {
                method: 'POST',
                data: { 
                    blog_url: blogUrl,
                    review_text: reviewText 
                }
            });
            
            if (result.success) {
                alert('인증이 제출되었습니다! 확인 후 결과를 알려드리겠습니다.');
                modal.remove();
                loadMyMissions();
            } else {
                alert(result.message || '인증 제출에 실패했습니다.');
            }
        } catch (error) {
            alert(error.message || '인증 제출 중 오류가 발생했습니다.');
        }
    });
    
    // 글자 수 카운터
    const reviewTextArea = document.getElementById('reviewText');
    const charCount = document.getElementById('charCount');
    
    reviewTextArea.addEventListener('input', function() {
        const currentLength = this.value.length;
        charCount.textContent = `${currentLength}/150`;
        
        if (currentLength > 150) {
            charCount.style.color = '#dc2626'; // red-600
        } else {
            charCount.style.color = '#6b7280'; // gray-500
        }
    });
    
    // 모달 외부 클릭시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 미션 인증 현황 보기
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
                        ${verification.review_text ? `
                            <div class="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                                <strong class="text-xs text-gray-500">후기:</strong> ${verification.review_text}
                            </div>
                        ` : ''}
                        <div class="text-xs text-gray-500 mt-2">
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
                        <h3 class="text-lg font-bold text-gray-800">내 인증 현황</h3>
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

// 미션 상세 정보 보기
async function showMissionDetail(missionId) {
    try {
        const result = await apiRequest(`/api/missions/${missionId}`);
        
        if (result.success) {
            const mission = result.mission;
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-800">${mission.title}</h3>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="text-gray-500 hover:text-gray-700">
                            ✕
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        <div>
                            <h4 class="font-medium text-gray-800 mb-1">설명</h4>
                            <p class="text-sm text-gray-600">${mission.description || '설명이 없습니다.'}</p>
                        </div>
                        
                        <div>
                            <h4 class="font-medium text-gray-800 mb-1">진행 기간</h4>
                            <p class="text-sm text-gray-600">${mission.start_date} ~ ${mission.end_date}</p>
                        </div>
                        
                        <div>
                            <h4 class="font-medium text-gray-800 mb-1">참여자 수</h4>
                            <p class="text-sm text-gray-600">${mission.participant_count}명</p>
                        </div>
                        
                        <div class="pt-3 border-t">
                            <button onclick="joinMission(${mission.id}); this.closest('.fixed').remove();" 
                                    class="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded">
                                이 미션 참여하기
                            </button>
                        </div>
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
        alert(error.message || '미션 정보를 불러오는데 실패했습니다.');
    }
}

// 커뮤니티 통계 로드
async function loadCommunityStatistics() {
    try {
        const result = await apiRequest('/api/statistics/community');
        
        if (result.success) {
            const stats = result.statistics;
            
            // 주요 지표 카드 업데이트
            updateCommunityStatsCards(stats);
            
            // 차트 생성
            createMissionParticipationChart(stats.missionParticipation);
            createVerificationStatusChart(stats.verificationStatus);
            createWeeklyTrendChart(stats.weeklyVerifications);
            createTopUsersChart(stats.topUsers);
        }
    } catch (error) {
        console.error('Error loading community statistics:', error);
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
    const ctx = document.getElementById('missionParticipationChart').getContext('2d');
    
    if (communityCharts.missionParticipation) {
        communityCharts.missionParticipation.destroy();
    }
    
    const chartData = data.slice(0, 5); // 상위 5개 미션만 표시
    
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
    const ctx = document.getElementById('verificationStatusChart').getContext('2d');
    
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
                    'rgba(251, 191, 36, 0.8)', // 대기 중 - 노랑
                    'rgba(34, 197, 94, 0.8)',  // 완료 - 초록
                    'rgba(239, 68, 68, 0.8)'   // 재검토 - 빨강
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
    const ctx = document.getElementById('weeklyTrendChart').getContext('2d');
    
    if (communityCharts.weeklyTrend) {
        communityCharts.weeklyTrend.destroy();
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
    const ctx = document.getElementById('topUsersChart').getContext('2d');
    
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

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('대시보드 페이지 로드 시작');
    
    // 토큰 확인
    const token = localStorage.getItem('token');
    console.log('토큰:', token ? '존재함' : '없음');
    if (!token) {
        console.log('토큰이 없어서 홈으로 리다이렉트');
        window.location.href = '/';
        return;
    }
    
    // 잠시 후에 실행하여 DOM이 완전히 로드되었는지 확인
    setTimeout(() => {
        console.log('토큰 유효성 검증 시작');
        // 토큰 유효성 검증 및 데이터 로드
        apiRequest('/api/auth/verify')
            .then(result => {
                console.log('토큰 검증 결과:', result);
                
                // result가 null이면 토큰이 이미 common.js에서 삭제됨
                if (!result || !result.success) {
                    console.log('토큰 검증 실패 - 홈으로 리다이렉트');
                    window.location.href = '/';
                    return;
                }
                
                if (result.user.is_admin) {
                    console.log('관리자 사용자 - 관리자 페이지로 리다이렉트');
                    window.location.href = '/admin';
                    return;
                }
                
                console.log('일반 사용자 - 데이터 로드 시작');
                // 개인 데이터만 로드
                loadMyMissions();
                loadAllMissions();
            })
            .catch((error) => {
                // 네트워크 오류 등 예외 상황 - 토큰은 유지하고 재시도 가능하도록
                console.error('토큰 검증 중 오류 발생:', error);
                alert('네트워크 오류가 발생했습니다. 페이지를 새로고침해주세요.');
            });
    }, 100);
});