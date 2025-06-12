// controllers/NavigationController.js
import { ViewRenderer } from '../views/ViewRenderer.js';

export class NavigationController {
    constructor() {
        this.currentPage = 'home';
        this.viewRenderer = new ViewRenderer();
        this.navMenu = null;
        this.hamburger = null;
        this.isNavigating = false;
    }

    init() {
        console.log('NavigationController initialized');
        this.setupEventListeners();
        this.setupResponsiveHandling();
        this.initializeHomePage();
    }

    async initializeHomePage() {
        try {
            console.log('Initializing home page...');
            await this.viewRenderer.renderPage('home');
            this.updateNavigation('home');
        } catch (error) {
            console.error('Error initializing home page:', error);
        }
    }

    setupEventListeners() {
        // Handle navigation clicks (both nav-link and footer-link)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link') || e.target.classList.contains('footer-link')) {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                if (page) {
                    this.navigateToPage(page);
                }
            }
        });

        // Global navigation function
        window.navigateToPage = (page) => {
            this.navigateToPage(page);
        };

        // Custom navigation event
        window.addEventListener('navigate', (e) => {
            if (e.detail && e.detail.page) {
                this.navigateToPage(e.detail.page);
            }
        });

        // Handle hamburger menu
        this.hamburger = document.getElementById('hamburger');
        this.navMenu = document.getElementById('navMenu');
        
        if (this.hamburger) {
            this.hamburger.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Handle page rendered event
        document.addEventListener('pageRendered', (e) => {
            console.log(`Page rendered successfully: ${e.detail.page}`);
            this.onPageRendered(e.detail.page, e.detail.view);
        });
    }

    setupResponsiveHandling() {
        window.addEventListener('resize', () => {
            if (window.innerWidth > 968) {
                if (this.navMenu) this.navMenu.classList.remove('active');
                if (this.hamburger) this.hamburger.classList.remove('active');
            }
        });
    }

    async navigateToPage(page) {
        if (page === this.currentPage || this.isNavigating) return;
        
        console.log(`Navigating to: ${page}`);
        this.isNavigating = true;
        
        try {
            this.showLoadingIndicator();

            // Add small delay for smooth transition
            await new Promise(resolve => setTimeout(resolve, 150));

            await this.viewRenderer.renderPage(page);
            this.currentPage = page;
            this.updateNavigation(page);
            this.closeMobileMenu();
            
            // Smooth scroll to top with slight delay
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
            
            console.log(`Successfully navigated to: ${page}`);
            
        } catch (error) {
            console.error('Navigation error:', error);
            this.showNavigationError(error);
        } finally {
            this.isNavigating = false;
            this.hideLoadingIndicator();
        }
    }

    onPageRendered(page, view) {
        console.log(`Setting up page-specific functionality for: ${page}`);
        if (page === 'detector' && window.app && window.app.detectorController) {
        }
    }

    updateNavigation(activePage) {
        // Update nav-link classes
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === activePage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update footer-link classes (optional visual feedback)
        const footerLinks = document.querySelectorAll('.footer-link');
        footerLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === activePage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update page title
        this.updatePageTitle(activePage);
    }

    updatePageTitle(page) {
        const titles = {
            home: 'Beranda - Stress Chat Detector',
            detector: 'Detector - Stress Chat Detector',
            tutorial: 'Tutorial - Stress Chat Detector',
            about: 'Tentang - Stress Chat Detector',
            contact: 'Kontak - Stress Chat Detector'
        };
        
        document.title = titles[page] || 'Stress Chat Detector';
    }

    showLoadingIndicator() {
        // Add smooth fade out transition to current content
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            mainContent.style.opacity = '0.3';
            mainContent.style.transform = 'translateY(10px)';
        }
    }

    hideLoadingIndicator() {
        // Add smooth fade in transition to new content
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            setTimeout(() => {
                mainContent.style.opacity = '1';
                mainContent.style.transform = 'translateY(0)';
                // Remove transition after animation completes
                setTimeout(() => {
                    mainContent.style.transition = '';
                }, 300);
            }, 50);
        }
    }

    showNavigationError(error) {
        if (window.app && window.app.appController && window.app.appController.showAlert) {
            window.app.appController.showAlert(
                'Terjadi kesalahan saat memuat halaman. Silakan coba lagi.',
                'error'
            );
        } else {
            console.error('Navigation error:', error);
            alert('Terjadi kesalahan saat memuat halaman. Silakan coba lagi.');
        }
    }

    toggleMobileMenu() {
        if (this.navMenu) this.navMenu.classList.toggle('active');
        if (this.hamburger) this.hamburger.classList.toggle('active');
    }

    closeMobileMenu() {
        if (this.navMenu) this.navMenu.classList.remove('active');
        if (this.hamburger) this.hamburger.classList.remove('active');
    }

    getCurrentPage() {
        return this.currentPage;
    }

    // Method to get current view instance
    getCurrentView() {
        return this.viewRenderer.getCurrentView();
    }

    // Method to refresh current page
    async refreshCurrentPage() {
        await this.navigateToPage(this.currentPage);
    }
}