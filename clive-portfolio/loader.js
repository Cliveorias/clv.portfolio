// loader.js - Portfolio Intro Loading Animation Manager
document.addEventListener('DOMContentLoaded', () => {
    const loaderWrapper = document.getElementById('loader-wrapper');
    if (!loaderWrapper) return;

    // Ensure body doesn't scroll while loader is active
    document.body.classList.add('loading-active');

    // Ensure animation plays fully before fading out (2.8 seconds)
    const MIN_LOAD_TIME = 2800;
    const startTime = Date.now();

    const hideLoader = () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOAD_TIME - elapsedTime);

        setTimeout(() => {
            loaderWrapper.classList.add('fade-out');
            setTimeout(() => {
                loaderWrapper.style.display = 'none';
                document.body.classList.remove('loading-active');
            }, 600); // smooth CSS fade-out transition duration
        }, remainingTime);
    };

    if (document.readyState === 'complete') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader);
    }
});
