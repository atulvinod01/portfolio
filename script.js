document.addEventListener("DOMContentLoaded", function() {
    console.log("Portfolio loaded successfully!");

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Back to Top Button
    const backToTopButton = document.querySelector('.back-to-top');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }

        // Sticky Navbar with scroll direction
        const navbar = document.querySelector('.navbar');
        const currentScroll = window.scrollY;

        // Show or hide navbar based on scroll direction
        if (currentScroll > lastScroll) {
            // Scrolling down
            navbar.classList.remove('visible');
        } else {
            // Scrolling up
            navbar.classList.add('visible');
        }

        lastScroll = currentScroll <= 0 ? 0 : currentScroll; // For Mobile or negative scrolling

        // Check section visibility for animations
        checkSectionVisibility();
    });

    let lastScroll = 0; // Track the last scroll position

    // Function to check section visibility
    function checkSectionVisibility() {
        const sections = document.querySelectorAll('section');
        const triggerBottom = window.innerHeight / 5 * 4; // Adjust trigger point

        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;

            if (sectionTop < triggerBottom) {
                section.classList.add('visible');
            } else {
                section.classList.remove('visible');
            }
        });
    }

    // Initial check for section visibility
    checkSectionVisibility();

    // Lightbox functionality
    function openLightbox(projectId) {
        const lightbox = document.getElementById('lightbox');
        const lightboxDetails = document.getElementById('lightbox-details');

        if (projectId === 'project1') {
            lightboxDetails.innerHTML = `
                <h2>Decentralized Web Authentication</h2>
                <p>Developed a decentralized authentication system using Ethereum blockchain and MetaMask, integrated with Flask and IPFS.</p>
                <img src="project1-image.jpg" alt="Decentralized Web Authentication">
            `;
        } else if (projectId === 'project2') {
            lightboxDetails.innerHTML = `
                <h2>Insider Threat Detection using Machine Learning</h2>
                <p>Implemented a system to detect security threats in organizational networks using machine learning and Python.</p>
                <img src="project2-image.jpg" alt="Insider Threat Detection">
            `;
        }

        lightbox.style.display = 'flex';
    }

    function closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        lightbox.style.display = 'none';
    }

    // Expose functions to global scope if needed
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
});
