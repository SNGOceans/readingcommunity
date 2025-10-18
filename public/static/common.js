// 공통 JavaScript 함수들
window.API_BASE = '';

// 토큰 관리
window.getToken = function() {
    return localStorage.getItem('token');
};

window.setToken = function(token) {
    localStorage.setItem('token', token);
};

window.removeToken = function() {
    localStorage.removeItem('token');
};

// API 요청 헬퍼
window.apiRequest = async function(url, options = {}) {
    const token = window.getToken();
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`;
    }
    
    try {
        const response = await axios({
            url: window.API_BASE + url,
            headers: { ...defaultHeaders, ...options.headers },
            ...options
        });
        return response.data;
    } catch (error) {
        // 401 오류 시 토큰 검증 API에서만 토큰 삭제
        if (error.response?.status === 401) {
            // 토큰 검증 API인 경우에만 토큰 제거
            if (url.includes('/api/auth/verify')) {
                console.log('Token verification failed, removing token');
                localStorage.removeItem('token');
                // 로그인 페이지로 리다이렉트하지 않고 null 반환
                return null;
            }
            // 다른 API의 401 오류는 그대로 던짐
            console.warn('Unauthorized access to:', url);
        }
        throw error.response?.data || { success: false, message: '네트워크 오류가 발생했습니다.' };
    }
};

// 로그아웃
window.logout = function() {
    localStorage.removeItem('token');
    window.location.href = '/';
};

// 페이지 이동 함수 (강화된 버전)
window.goToPage = function(page) {
    console.log('goToPage called with:', page);
    
    // 페이지 유효성 검사
    if (!page) {
        console.error('goToPage: No page specified');
        return;
    }
    
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
    
    // 페이지 이동 실행
    try {
        window.location.href = url;
    } catch (error) {
        console.error('Navigation error:', error);
        // 폴백으로 직접 URL 변경
        window.location = url;
    }
};

// 네비게이션 상태 확인 디버그 함수
window.checkNavigation = function() {
    const navMenu = document.getElementById('navigationMenu');
    if (navMenu) {
        console.log('Navigation menu HTML:', navMenu.innerHTML);
        console.log('Navigation buttons count:', navMenu.querySelectorAll('button').length);
        return {
            html: navMenu.innerHTML,
            buttonCount: navMenu.querySelectorAll('button').length,
            buttons: Array.from(navMenu.querySelectorAll('button')).map(btn => ({
                text: btn.textContent,
                onclick: btn.onclick ? btn.onclick.toString() : btn.getAttribute('onclick')
            }))
        };
    }
    return { error: 'Navigation menu not found' };
};