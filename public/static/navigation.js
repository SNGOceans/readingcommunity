// 네비게이션 시스템 JavaScript

// 네비게이션 메뉴 생성
window.createNavigationMenu = async function() {
    console.log('createNavigationMenu called');
    const token = window.getToken();
    let user = null;
    
    // 토큰이 있으면 사용자 정보 확인
    if (token) {
        try {
            if (window.apiRequest) {
                const result = await window.apiRequest('/api/auth/verify');
                if (result && result.success) {
                    user = result.user;
                }
            }
        } catch (error) {
            // 토큰이 유효하지 않으면 제거
            console.log('Token verification failed:', error);
            localStorage.removeItem('token');
        }
    }
    
    const navigationMenu = document.getElementById('navigationMenu');
    if (!navigationMenu) return;
    
    let menuItems = [];
    
    if (!user) {
        // 로그인하지 않은 사용자
        menuItems = [
            { label: '홈', page: 'home', active: window.location.pathname === '/' },
            { label: '소개', page: 'about', active: window.location.pathname === '/about' },
            { label: '로그인', page: 'login', active: window.location.pathname === '/login' },
            { label: '회원가입', page: 'register', active: false }
        ];
    } else if (user.is_admin) {
        // 관리자 사용자
        menuItems = [
            { label: '홈', page: 'home', active: window.location.pathname === '/' },
            { label: '소개', page: 'about', active: window.location.pathname === '/about' },
            { label: '대시보드', page: 'dashboard', active: window.location.pathname === '/dashboard' },
            { label: '마이페이지', page: 'mypage', active: window.location.pathname === '/mypage' },
            { label: '관리자', page: 'admin', active: window.location.pathname === '/admin' },
            { label: '로그아웃', page: 'logout', active: false }
        ];
    } else {
        // 일반 사용자
        menuItems = [
            { label: '홈', page: 'home', active: window.location.pathname === '/' },
            { label: '소개', page: 'about', active: window.location.pathname === '/about' },
            { label: '대시보드', page: 'dashboard', active: window.location.pathname === '/dashboard' },
            { label: '마이페이지', page: 'mypage', active: window.location.pathname === '/mypage' },
            { label: '로그아웃', page: 'logout', active: false }
        ];
    }
    
    // 메뉴 HTML 생성 (data-page 사용)
    const menuHTML = menuItems.map((item, index) => {
        const baseClasses = 'px-3 py-2 rounded-md text-sm font-medium transition cursor-pointer';
        const activeClasses = item.active 
            ? 'bg-blue-500 text-white' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
        
        return `<button data-page="${item.page}" data-index="${index}" class="${baseClasses} ${activeClasses}">${item.label}</button>`;
    }).join('');
    
    console.log('Generated navigation HTML:', menuHTML);
    navigationMenu.innerHTML = menuHTML;
    
    // 생성된 버튼에 이벤트 리스너 추가
    const buttons = navigationMenu.querySelectorAll('button');
    console.log('Created', buttons.length, 'navigation buttons');
    
    buttons.forEach((btn, idx) => {
        const page = btn.getAttribute('data-page');
        console.log(`Button ${idx}: "${btn.textContent}" - page: ${page}`);
        
        // 클릭 이벤트 리스너 추가
        btn.addEventListener('click', function() {
            console.log('Button clicked:', btn.textContent, 'Page:', page);
            
            // 페이지별 동작 처리
            if (page === 'logout') {
                if (window.logout) {
                    window.logout();
                } else {
                    localStorage.removeItem('token');
                    window.location.href = '/';
                }
            } else if (window.goToPage) {
                window.goToPage(page);
            } else {
                // 폴백 - 직접 페이지 이동
                const routes = {
                    'home': '/',
                    'about': '/about',
                    'login': '/login',
                    'register': '/register',
                    'dashboard': '/dashboard',
                    'mypage': '/mypage',
                    'admin': '/admin'
                };
                window.location.href = routes[page] || '/';
            }
        });
    });
    
    // 홈페이지의 액션 버튼들도 초기화
    window.initializeActionButtons();
};

// 간략한 커뮤니티 통계 로드 (소개 페이지용)
window.loadCommunityQuickStats = async function() {
    const quickStatsElement = document.getElementById('communityQuickStats');
    if (!quickStatsElement) return;
    
    try {
        const response = await fetch('/api/statistics/community');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.statistics;
            const totalMissions = stats.missionParticipation.length;
            const totalUsers = stats.topUsers.length;
            const totalVerifications = stats.verificationStatus.reduce((sum, s) => sum + s.count, 0);
            const completedVerifications = stats.verificationStatus.find(s => s.verification_status === 'completed')?.count || 0;
            
            quickStatsElement.innerHTML = `
                <div class="bg-blue-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-blue-600">${totalMissions}</div>
                    <div class="text-sm text-gray-600">진행 중인 미션</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-green-600">${totalUsers}</div>
                    <div class="text-sm text-gray-600">활동 중인 멤버</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-purple-600">${totalVerifications}</div>
                    <div class="text-sm text-gray-600">누적 인증</div>
                </div>
                <div class="bg-yellow-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-yellow-600">${Math.round(completedVerifications / totalVerifications * 100) || 0}%</div>
                    <div class="text-sm text-gray-600">완료율</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading community quick stats:', error);
        if (quickStatsElement) {
            quickStatsElement.innerHTML = '<p class="col-span-4 text-center text-gray-500">통계를 불러오는 중...</p>';
        }
    }
};

// 페이지 로드시 네비게이션 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
    initializeNavigation();
}

function initializeNavigation() {
    try {
        console.log('Navigation.js initializing...');
        console.log('window.createNavigationMenu exists:', typeof window.createNavigationMenu);
        
        // 함수가 존재한다면 호출
        if (typeof window.createNavigationMenu === 'function') {
            console.log('Calling createNavigationMenu...');
            window.createNavigationMenu().then(() => {
                console.log('createNavigationMenu completed');
            }).catch(error => {
                console.error('createNavigationMenu error:', error);
            });
        } else {
            console.warn('createNavigationMenu function not available');
        }
        
        if (window.loadCommunityQuickStats) {
            window.loadCommunityQuickStats();
        }
        
        // 홈페이지라면 액션 버튼도 초기화
        if (window.location.pathname === '/' && window.initializeActionButtons) {
            setTimeout(() => {
                window.initializeActionButtons();
            }, 100); // DOM이 완전히 로드된 후 실행
        }
    } catch (error) {
        console.error('Navigation initialization error:', error);
    }
}

// 액션 버튼들 초기화 (홈페이지 하단 버튼들) - 강화된 버전
window.initializeActionButtons = function() {
    console.log('Initializing action buttons...');
    
    // 잠시 대기 후 실행 (DOM 완전 로드 보장)
    setTimeout(() => {
        const actionButtons = document.querySelectorAll('.action-button[data-page]');
        console.log('Found', actionButtons.length, 'action buttons');
        
        if (actionButtons.length === 0) {
            // 한 번 더 시도 (일부 페이지에는 action button이 없을 수 있음)
            setTimeout(() => {
                const retryButtons = document.querySelectorAll('.action-button[data-page]');
                if (retryButtons.length > 0) {
                    console.log('Retry: Found', retryButtons.length, 'action buttons');
                    setupActionButtonEvents(retryButtons);
                }
            }, 500);
        } else {
            setupActionButtonEvents(actionButtons);
        }
    }, 50);
};

function setupActionButtonEvents(buttons) {
    buttons.forEach((btn, idx) => {
        const page = btn.getAttribute('data-page');
        console.log(`Action Button ${idx}: "${btn.textContent.trim()}" - page: ${page}`);
        
        // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
        btn.removeEventListener('click', handleActionButtonClick);
        btn.addEventListener('click', handleActionButtonClick);
        
        // 추가 보험: data-page 속성이 없으면 onclick에서 추출
        if (!page) {
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes('goToPage')) {
                console.log(`Extracting page from onclick: ${onclickAttr}`);
            }
        }
    });
}

// 액션 버튼 클릭 핸들러 - 강화된 버전
function handleActionButtonClick(event) {
    // 이벤트 전파 방지
    event.preventDefault();
    event.stopPropagation();
    
    const btn = event.target;
    const page = btn.getAttribute('data-page');
    console.log('Action button clicked:', btn.textContent.trim(), 'Page:', page);
    
    if (!page) {
        console.error('No page attribute found on button');
        return;
    }
    
    // 우선순위: window.goToPage 함수 사용
    if (window.goToPage && typeof window.goToPage === 'function') {
        console.log('Using window.goToPage function');
        window.goToPage(page);
    } else {
        // 폴백 - 직접 페이지 이동
        console.log('Using fallback navigation');
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
        console.log('Fallback navigating to:', url);
        
        try {
            window.location.href = url;
        } catch (error) {
            console.error('Navigation error:', error);
            window.location = url;
        }
    }
}

// 전역 함수는 common.js에서 이미 정의됨