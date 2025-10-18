// 관리자 페이지 JavaScript
window.API_BASE = window.API_BASE || '';
let adminCharts = {}; // 관리자 차트 인스턴스 저장

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
        if (error.response?.status === 403) {
            alert('관리자 권한이 필요합니다.');
            window.location.href = '/dashboard';
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

// 미션 목록 로드
async function loadMissions() {
    try {
        const result = await apiRequest('/api/admin/missions');
        
        if (result.success) {
            const missionsHtml = result.missions.map(mission => `
                <div class="border border-gray-200 rounded-lg p-4 mb-3">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-medium text-gray-800">${mission.title}</h3>
                        <div class="flex space-x-2">
                            ${mission.is_active ? 
                                '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">활성</span>' :
                                '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">비활성</span>'
                            }
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">${mission.description || ''}</p>
                    <div class="text-xs text-gray-500 mb-3 grid grid-cols-2 gap-2">
                        <div>기간: ${mission.start_date} ~ ${mission.end_date}</div>
                        <div>참여자: ${mission.participant_count}명</div>
                        <div>총 인증: ${mission.total_verifications}건</div>
                        <div>완료 인증: ${mission.completed_verifications}건</div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="showEditMissionForm(${JSON.stringify(mission).replace(/"/g, '&quot;')})" 
                                class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">
                            수정
                        </button>
                        <button onclick="showMissionParticipants(${mission.id})" 
                                class="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200">
                            참여자 보기
                        </button>
                        <button onclick="deleteMission(${mission.id})" 
                                class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200">
                            삭제
                        </button>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('missionsList').innerHTML = 
                missionsHtml || '<p class="text-gray-500 text-sm">등록된 미션이 없습니다.</p>';
        }
    } catch (error) {
        console.error('Error loading missions:', error);
        document.getElementById('missionsList').innerHTML = 
            '<p class="text-red-500 text-sm">미션 목록을 불러오는데 실패했습니다.</p>';
    }
}

// 참여자 통계 로드
async function loadParticipantStats() {
    try {
        const [statsResult, participantsResult, verificationsResult] = await Promise.all([
            apiRequest('/api/admin/dashboard/stats'),
            apiRequest('/api/admin/participants'),
            apiRequest('/api/admin/verifications?status=pending')
        ]);
        
        if (statsResult.success) {
            const stats = statsResult.stats;
            
            const statsHtml = `
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-blue-50 p-3 rounded">
                        <div class="text-xs text-gray-600">전체 사용자</div>
                        <div class="text-lg font-bold text-blue-600">${stats.total_users}명</div>
                    </div>
                    <div class="bg-green-50 p-3 rounded">
                        <div class="text-xs text-gray-600">활성 미션</div>
                        <div class="text-lg font-bold text-green-600">${stats.active_missions}개</div>
                    </div>
                    <div class="bg-purple-50 p-3 rounded">
                        <div class="text-xs text-gray-600">총 참여</div>
                        <div class="text-lg font-bold text-purple-600">${stats.total_participations}건</div>
                    </div>
                    <div class="bg-yellow-50 p-3 rounded">
                        <div class="text-xs text-gray-600">대기 인증</div>
                        <div class="text-lg font-bold text-yellow-600">${stats.pending_verifications}건</div>
                    </div>
                </div>
            `;
            
            let participantsHtml = '';
            if (participantsResult.success && participantsResult.participants.length > 0) {
                participantsHtml = `
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-medium text-gray-800">최근 가입자</h4>
                        <button onclick="showAllParticipants()" 
                                class="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200">
                            전체 보기 (${participantsResult.participants.length}명)
                        </button>
                    </div>
                    <div class="space-y-2 mb-4">
                        ${participantsResult.participants.slice(0, 5).map(participant => `
                            <div class="flex justify-between items-center text-sm border border-gray-200 rounded p-2">
                                <div>
                                    <span class="font-medium">${participant.name}</span>
                                    <span class="text-gray-500">(${participant.email})</span>
                                    <span class="text-xs text-gray-500 ml-2">
                                        미션 ${participant.joined_missions}개 참여
                                    </span>
                                </div>
                                <div class="flex space-x-2">
                                    <button onclick="deleteUser(${participant.id}, '${participant.name}', '${participant.email}')" 
                                            class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                                            title="사용자 삭제">
                                        삭제
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            let pendingHtml = '';
            if (verificationsResult.success && verificationsResult.verifications.length > 0) {
                const pendingCount = verificationsResult.verifications.length;
                pendingHtml = `
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-medium text-gray-800">대기 중인 인증</h4>
                        ${pendingCount > 3 ? `
                            <button onclick="showAllPendingVerifications()" 
                                    class="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200">
                                전체 보기 (${pendingCount}건)
                            </button>
                        ` : ''}
                    </div>
                    <div class="space-y-2">
                        ${verificationsResult.verifications.slice(0, 3).map(verification => `
                            <div class="text-sm border border-gray-200 rounded p-2">
                                <div class="font-medium">${verification.user_name}</div>
                                <div class="text-gray-600">${verification.mission_title}</div>
                                <a href="${verification.blog_url}" target="_blank" 
                                   class="text-xs text-blue-600 hover:text-blue-800 break-all">
                                    ${verification.blog_url}
                                </a>
                                <div class="flex space-x-2 mt-2">
                                    <button onclick="updateVerificationStatus(${verification.id}, 'completed')" 
                                            class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                                        승인
                                    </button>
                                    <button onclick="updateVerificationStatus(${verification.id}, 'needs_review')" 
                                            class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                        재검토
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            document.getElementById('participantStats').innerHTML = statsHtml + participantsHtml + pendingHtml;
        }
    } catch (error) {
        console.error('Error loading participant stats:', error);
        document.getElementById('participantStats').innerHTML = 
            '<p class="text-red-500 text-sm">통계를 불러오는데 실패했습니다.</p>';
    }
}

// 새 미션 생성 폼 표시
function showCreateMission() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-bold text-gray-800 mb-4">새 미션 생성</h3>
            
            <form id="missionForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">제목</label>
                    <input type="text" id="missionTitle" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">설명</label>
                    <textarea id="missionDescription" rows="3"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                        <input type="date" id="missionStartDate" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                        <input type="date" id="missionEndDate" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button type="submit" 
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                        생성하기
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
    
    // 오늘 날짜로 기본값 설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('missionStartDate').value = today;
    
    document.getElementById('missionForm').addEventListener('submit', createMission);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 미션 생성
async function createMission(e) {
    e.preventDefault();
    
    const title = document.getElementById('missionTitle').value;
    const description = document.getElementById('missionDescription').value;
    const start_date = document.getElementById('missionStartDate').value;
    const end_date = document.getElementById('missionEndDate').value;
    
    try {
        const result = await apiRequest('/api/admin/missions', {
            method: 'POST',
            data: { title, description, start_date, end_date }
        });
        
        if (result.success) {
            alert('미션이 생성되었습니다!');
            document.querySelector('.fixed').remove();
            loadMissions();
        } else {
            alert(result.message || '미션 생성에 실패했습니다.');
        }
    } catch (error) {
        alert(error.message || '미션 생성 중 오류가 발생했습니다.');
    }
}

// 미션 수정 폼 표시
function showEditMissionForm(missionData) {
    const mission = typeof missionData === 'string' ? JSON.parse(missionData) : missionData;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-bold text-gray-800 mb-4">미션 수정</h3>
            
            <form id="editMissionForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">제목</label>
                    <input type="text" id="editMissionTitle" value="${mission.title}" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">설명</label>
                    <textarea id="editMissionDescription" rows="3"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${mission.description || ''}</textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                        <input type="date" id="editMissionStartDate" value="${mission.start_date}" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                        <input type="date" id="editMissionEndDate" value="${mission.end_date}" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <div>
                    <label class="flex items-center">
                        <input type="checkbox" id="editMissionActive" ${mission.is_active ? 'checked' : ''} 
                               class="mr-2">
                        <span class="text-sm font-medium text-gray-700">활성 상태</span>
                    </label>
                </div>
                
                <div class="flex space-x-3">
                    <button type="submit" 
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                        수정하기
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
    
    document.getElementById('editMissionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('editMissionTitle').value;
        const description = document.getElementById('editMissionDescription').value;
        const start_date = document.getElementById('editMissionStartDate').value;
        const end_date = document.getElementById('editMissionEndDate').value;
        const is_active = document.getElementById('editMissionActive').checked;
        
        try {
            const result = await apiRequest(`/api/admin/missions/${mission.id}`, {
                method: 'PUT',
                data: { title, description, start_date, end_date, is_active }
            });
            
            if (result.success) {
                alert('미션이 수정되었습니다!');
                modal.remove();
                loadMissions();
            } else {
                alert(result.message || '미션 수정에 실패했습니다.');
            }
        } catch (error) {
            alert(error.message || '미션 수정 중 오류가 발생했습니다.');
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 미션 삭제
async function deleteMission(missionId) {
    if (!confirm('정말로 이 미션을 삭제하시겠습니까?\n참여자가 있는 미션은 삭제할 수 없습니다.')) {
        return;
    }
    
    try {
        const result = await apiRequest(`/api/admin/missions/${missionId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            alert('미션이 삭제되었습니다.');
            loadMissions();
        } else {
            alert(result.message || '미션 삭제에 실패했습니다.');
        }
    } catch (error) {
        alert(error.message || '미션 삭제 중 오류가 발생했습니다.');
    }
}

// 미션 참여자 보기
async function showMissionParticipants(missionId) {
    try {
        const result = await apiRequest(`/api/admin/missions/${missionId}/participants`);
        
        if (result.success) {
            const participantsHtml = result.participants.map(participant => `
                <div class="border border-gray-200 rounded p-3">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="font-medium">${participant.name}</div>
                            <div class="text-sm text-gray-600">${participant.email}</div>
                        </div>
                        <div class="text-xs text-gray-500">
                            참여일: ${new Date(participant.joined_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="text-xs text-gray-600 grid grid-cols-3 gap-2">
                        <div>총 인증: ${participant.verification_count}건</div>
                        <div>완료: ${participant.completed_count}건</div>
                        <div>대기: ${participant.pending_count}건</div>
                    </div>
                </div>
            `).join('');
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-96 overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-800">미션 참여자 목록</h3>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="text-gray-500 hover:text-gray-700">
                            ✕
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        ${participantsHtml || '<p class="text-gray-500 text-sm">참여자가 없습니다.</p>'}
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
        alert(error.message || '참여자 목록을 불러오는데 실패했습니다.');
    }
}

// 모달에서 인증 상태 업데이트 후 모달 닫기
async function handleVerificationUpdate(verificationId, status) {
    await updateVerificationStatus(verificationId, status);
    // 모든 모달 제거
    const modals = document.querySelectorAll('.fixed.inset-0');
    modals.forEach(modal => modal.remove());
}

// 전체 참여자 모달 표시
async function showAllParticipants() {
    try {
        const result = await apiRequest('/api/admin/participants');
        
        if (result.success && result.participants.length > 0) {
            const participantsHtml = result.participants.map(participant => `
                <div class="border border-gray-200 rounded-lg p-4 mb-3">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <div class="font-medium text-gray-800">${participant.name}</div>
                            <div class="text-sm text-gray-600">${participant.email}</div>
                            <div class="text-xs text-gray-500 mt-1">
                                가입일: ${new Date(participant.created_at).toLocaleString()}
                            </div>
                        </div>
                        <div class="flex flex-col space-y-2">
                            <div class="text-sm">
                                <span class="text-gray-600">미션 참여:</span>
                                <span class="font-medium">${participant.joined_missions}개</span>
                            </div>
                            <div class="text-sm">
                                <span class="text-gray-600">인증 완료:</span>
                                <span class="font-medium">${participant.completed_verifications}건</span>
                            </div>
                            <button onclick="deleteUser(${participant.id}, '${participant.name}', '${participant.email}')" 
                                    class="text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200">
                                사용자 삭제
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // 모달 HTML 생성
            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                        <!-- 모달 헤더 (고정) -->
                        <div class="flex justify-between items-center p-6 pb-4 border-b bg-white">
                            <h3 class="text-xl font-bold text-gray-800">전체 참여자 (${result.participants.length}명)</h3>
                            <button onclick="this.closest('.fixed').remove()"
                                    class="text-gray-500 hover:text-gray-700 text-2xl">
                                ✕
                            </button>
                        </div>

                        <!-- 모달 내용 (스크롤 가능) -->
                        <div class="flex-1 overflow-y-auto p-6 pt-4">
                            <div class="space-y-3">
                                ${participantsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } else {
            alert('참여자 목록을 불러오는데 실패했습니다.');
        }
    } catch (error) {
        console.error('Error loading participants:', error);
        alert('참여자 목록을 불러오는데 실패했습니다.');
    }
}

// 전체 대기 인증 모달 표시
async function showAllPendingVerifications() {
    try {
        const result = await apiRequest('/api/admin/verifications?status=pending');
        
        if (result.success && result.verifications.length > 0) {
            const verificationsHtml = result.verifications.map(verification => `
                <div class="border border-gray-200 rounded-lg p-4 mb-3">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <div class="font-medium text-gray-800">${verification.user_name}</div>
                            <div class="text-sm text-gray-600">${verification.mission_title}</div>
                            <a href="${verification.blog_url}" target="_blank" 
                               class="text-sm text-blue-600 hover:text-blue-800 break-all">
                                ${verification.blog_url}
                            </a>
                            ${verification.review_text ? `
                                <div class="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                                    <strong class="text-xs text-gray-500">후기:</strong> ${verification.review_text}
                                </div>
                            ` : ''}
                            <div class="text-xs text-gray-500 mt-2">
                                제출일: ${new Date(verification.submitted_at).toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2 mt-3">
                        <button onclick="handleVerificationUpdate(${verification.id}, 'completed')" 
                                class="flex-1 text-sm bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">
                            승인
                        </button>
                        <button onclick="handleVerificationUpdate(${verification.id}, 'needs_review')" 
                                class="flex-1 text-sm bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600">
                            재검토
                        </button>
                    </div>
                </div>
            `).join('');
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                    <!-- 모달 헤더 (고정) -->
                    <div class="flex justify-between items-center p-6 pb-4 border-b bg-white">
                        <h3 class="text-xl font-bold text-gray-800">대기 중인 인증 전체 (${result.verifications.length}건)</h3>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="text-gray-500 hover:text-gray-700 text-2xl">
                            ✕
                        </button>
                    </div>
                    
                    <!-- 모달 내용 (스크롤 가능) -->
                    <div class="flex-1 overflow-y-auto p-6 pt-4">
                        <div class="space-y-3">
                            ${verificationsHtml}
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
        } else {
            alert('대기 중인 인증이 없습니다.');
        }
    } catch (error) {
        console.error('Error loading all pending verifications:', error);
        alert('대기 인증 목록을 불러오는데 실패했습니다.');
    }
}

// 인증 상태 업데이트
async function updateVerificationStatus(verificationId, status) {
    const statusNames = {
        'completed': '완료',
        'needs_review': '재검토 필요',
        'pending': '대기'
    };
    
    if (!confirm(`인증 상태를 "${statusNames[status]}"로 변경하시겠습니까?`)) {
        return;
    }
    
    try {
        const result = await apiRequest(`/api/admin/verifications/${verificationId}`, {
            method: 'PUT',
            data: { 
                verification_status: status,
                crawl_result: status === 'completed' ? '관리자 승인' : '재검토 요청'
            }
        });
        
        if (result.success) {
            alert('인증 상태가 업데이트되었습니다.');
            loadParticipantStats();
        } else {
            alert(result.message || '인증 상태 업데이트에 실패했습니다.');
        }
    } catch (error) {
        alert(error.message || '인증 상태 업데이트 중 오류가 발생했습니다.');
    }
}

// 회원 삭제 함수
async function deleteUser(userId, userName, userEmail) {
    // 확인 다이얼로그
    const confirmMessage = `정말로 사용자 "${userName} (${userEmail})"를 삭제하시겠습니까?\n\n삭제 시 다음 데이터도 함께 삭제됩니다:\n- 미션 참여 기록\n- 인증 제출 기록\n- 후기글\n\n이 작업은 되돌릴 수 없습니다.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const result = await apiRequest(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            alert(result.message);
            
            // 모든 모달 제거
            const modals = document.querySelectorAll('.fixed.inset-0');
            modals.forEach(modal => modal.remove());
            
            // 참여자 통계 다시 로드
            loadParticipantStats();
        } else {
            alert(result.message || '사용자 삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        alert('사용자 삭제 중 오류가 발생했습니다.');
    }
}

// 관리자 대시보드 통계 로드
async function loadAdminDashboardStats() {
    try {
        const [communityResult, dashboardResult] = await Promise.all([
            apiRequest('/api/statistics/community'),
            apiRequest('/api/admin/dashboard/stats')
        ]);
        
        if (communityResult.success && dashboardResult.success) {
            const communityStats = communityResult.statistics;
            const dashboardStats = dashboardResult.stats;
            
            // 관리자 지표 카드 업데이트
            updateAdminStatsCards(dashboardStats);
            
            // 관리자 차트 생성
            createAdminMissionChart(communityStats.missionParticipation);
            createAdminUserActivityChart(communityStats.topUsers);
            createAdminGrowthChart(communityStats.monthlyActivity);
            createAdminVerificationChart(communityStats.verificationStatus);
        }
    } catch (error) {
        console.error('Error loading admin dashboard stats:', error);
    }
}

// 관리자 지표 카드 업데이트
function updateAdminStatsCards(stats) {
    document.getElementById('adminStats').innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-600">${stats.total_users}</div>
            <div class="text-sm text-gray-600">전체 사용자</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-600">${stats.active_missions}</div>
            <div class="text-sm text-gray-600">활성 미션</div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-purple-600">${stats.total_verifications}</div>
            <div class="text-sm text-gray-600">총 인증</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-yellow-600">${stats.pending_verifications}</div>
            <div class="text-sm text-gray-600">대기 인증</div>
        </div>
    `;
}

// 미션 성과 분석 차트
function createAdminMissionChart(data) {
    const ctx = document.getElementById('adminMissionChart');
    if (!ctx) return;
    
    if (adminCharts.mission) {
        adminCharts.mission.destroy();
    }
    
    const chartData = data.slice(0, 6);
    
    adminCharts.mission = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(m => m.title.length > 12 ? m.title.substring(0, 12) + '...' : m.title),
            datasets: [
                {
                    label: '참여자',
                    data: chartData.map(m => m.participants),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: '완료율 (%)',
                    data: chartData.map(m => m.total_verifications > 0 ? Math.round(m.completed_verifications / m.total_verifications * 100) : 0),
                    type: 'line',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}

// 사용자 활동 분포 차트
function createAdminUserActivityChart(data) {
    const ctx = document.getElementById('adminUserActivityChart');
    if (!ctx) return;
    
    if (adminCharts.userActivity) {
        adminCharts.userActivity.destroy();
    }
    
    const topUsers = data.slice(0, 8);
    
    adminCharts.userActivity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topUsers.map(u => u.name),
            datasets: [{
                label: '완료 인증',
                data: topUsers.map(u => u.completed_verifications),
                backgroundColor: 'rgba(147, 51, 234, 0.6)',
                borderColor: 'rgba(147, 51, 234, 1)',
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

// 월별 커뮤니티 성장 차트
function createAdminGrowthChart(data) {
    const ctx = document.getElementById('adminGrowthChart');
    if (!ctx) return;
    
    if (adminCharts.growth) {
        adminCharts.growth.destroy();
    }
    
    adminCharts.growth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.month).reverse(),
            datasets: [{
                label: '신규 가입자',
                data: data.map(d => d.new_users).reverse(),
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
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 인증 처리 현황 차트
function createAdminVerificationChart(data) {
    const ctx = document.getElementById('adminVerificationChart');
    if (!ctx) return;
    
    if (adminCharts.verification) {
        adminCharts.verification.destroy();
    }
    
    const statusLabels = {
        'pending': '처리 대기',
        'completed': '승인 완료',
        'needs_review': '재검토'
    };
    
    adminCharts.verification = new Chart(ctx, {
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

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 토큰 확인
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    // 토큰 유효성 및 관리자 권한 검증
    apiRequest('/api/auth/verify')
        .then(result => {
            // result가 null이면 토큰이 이미 common.js에서 삭제됨
            if (!result || !result.success) {
                console.log('토큰 검증 실패 - 홈으로 리다이렉트');
                window.location.href = '/';
                return;
            }
            
            if (!result.user.is_admin) {
                alert('관리자 권한이 필요합니다.');
                window.location.href = '/dashboard';
                return;
            }
            
            // 관리자 데이터 로드
            loadAdminDashboardStats();
            
            // 기본으로 미션 관리 탭 활성화
            setTimeout(() => {
                showMissionsManagement();
            }, 100);
        })
        .catch((error) => {
            // 네트워크 오류 등 예외 상황 - 토큰은 유지하고 재시도 가능하도록
            console.error('토큰 검증 중 오류 발생:', error);
            alert('네트워크 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        });
});

// 후기글 관리 기능
async function loadReviews() {
    try {
        const result = await apiRequest('/api/admin/reviews');
        
        if (result.success) {
            const reviewsHtml = result.reviews.map(review => `
                <div class="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="font-medium text-gray-800">${review.user_name}</span>
                                <span class="text-sm text-gray-500">(${review.user_email})</span>
                                <span class="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                                    ${review.mission_title}
                                </span>
                            </div>
                            <div class="text-sm text-gray-600 mb-2">
                                <a href="${review.blog_url}" target="_blank" class="text-blue-600 hover:text-blue-800 break-all">
                                    ${review.blog_url}
                                </a>
                            </div>
                        </div>
                        <span class="text-xs text-gray-500 whitespace-nowrap ml-4">
                            ${new Date(review.submitted_at).toLocaleDateString()}
                        </span>
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-sm font-medium text-gray-700 mb-1">후기글:</div>
                        <div class="text-sm text-gray-800">${review.review_text}</div>
                    </div>
                    
                    <div class="flex justify-end mt-3">
                        <span class="text-xs px-2 py-1 rounded ${
                            review.verification_status === 'completed' ? 'bg-green-100 text-green-600' :
                            review.verification_status === 'needs_review' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                        }">
                            ${
                                review.verification_status === 'completed' ? '승인됨' :
                                review.verification_status === 'needs_review' ? '재검토 필요' :
                                '대기중'
                            }
                        </span>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('reviewsList').innerHTML = 
                reviewsHtml || '<p class="text-gray-500 text-center py-8">작성된 후기글이 없습니다.</p>';
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviewsList').innerHTML = 
            '<p class="text-red-500 text-center py-8">후기글을 불러오는데 실패했습니다.</p>';
    }
}

// 탭 활성화 함수
function setActiveTab(tabId) {
    // 모든 탭 비활성화
    document.querySelectorAll('nav button').forEach(tab => {
        tab.classList.remove('text-blue-600', 'border-blue-600');
        tab.classList.add('text-gray-500', 'border-transparent');
    });
    
    // 선택된 탭 활성화
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.remove('text-gray-500', 'border-transparent');
        activeTab.classList.add('text-blue-600', 'border-blue-600');
    }
}

// 미션 관리 섹션 표시
function showMissionsManagement() {
    setActiveTab('missionsTab');
    document.getElementById('content').innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-bold text-gray-800">미션 관리</h3>
                <button onclick="showCreateMission()" 
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                    새 미션 생성
                </button>
            </div>
            <div id="missionsList">
                <div class="flex justify-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        </div>
    `;
    
    // 미션 목록 로드
    loadMissions();
}

// 참여자 현황 섹션 표시 (기존 함수 수정)
function showParticipantStats() {
    setActiveTab('participantsTab');
    document.getElementById('content').innerHTML = `
        <div class="space-y-4">
            <h3 class="text-lg font-bold text-gray-800">참여자 현황</h3>
            <div id="participantStats">
                <div class="flex justify-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        </div>
    `;
    
    // 참여자 통계 로드
    loadParticipantStats();
}

// 후기글 관리 섹션 표시
function showReviewsManagement() {
    setActiveTab('reviewsTab');
    document.getElementById('content').innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-bold text-gray-800">후기글 관리</h3>
                <button onclick="loadReviews()" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                    새로고침
                </button>
            </div>
            
            <div class="mb-4">
                <p class="text-sm text-gray-600">
                    사용자들이 미션 인증과 함께 작성한 후기글을 확인할 수 있습니다. 
                    후기글은 최대 150자까지 작성 가능하며, 다른 멤버들과 소감을 나누는 공간입니다.
                </p>
            </div>
            
            <div id="reviewsList">
                <div class="flex justify-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        </div>
    `;
    
    // 후기글 로드
    loadReviews();
}