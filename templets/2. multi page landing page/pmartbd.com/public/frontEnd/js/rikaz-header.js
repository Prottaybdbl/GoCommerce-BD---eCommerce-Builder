(function ($) {
    "use strict";

    const $window = $(window);
    const $body = $("body");

    const $siteHeader = $("#rkSiteHeader");
    const $mobileDrawer = $("#rkMobileDrawer");
    const $mobileMenuButton = $("#rkMobileMenuButton");

    const $searchOverlay = $("#rkSearchOverlay");
    const $searchToggle = $("#rkSearchToggle");
    const $searchClose = $("#rkSearchClose");

    function openMobileDrawer() {
        $mobileDrawer.addClass("active");
        $body.addClass("rk-menu-open");
    }

    function closeMobileDrawer() {
        $mobileDrawer.removeClass("active");
        $body.removeClass("rk-menu-open");
    }

    function openSearch() {
        $searchOverlay.addClass("active");
        $body.addClass("rk-search-open");

        window.setTimeout(function () {
            $searchOverlay.find("input").first().trigger("focus");
        }, 250);
    }

    function closeSearch() {
        $searchOverlay.removeClass("active");
        $body.removeClass("rk-search-open");
    }

    function handleStickyHeader() {
        if ($window.scrollTop() > 120) {
            $siteHeader.addClass("rk-header-sticky");
        } else {
            $siteHeader.removeClass("rk-header-sticky");
        }
    }

    $("#rkMobileMenuButton, #rkMobileBottomMenuButton").on(
        "click",
        function () {
            openMobileDrawer();
        },
    );

    $("[data-rk-close-drawer]").on("click", function () {
        closeMobileDrawer();
    });

    $searchToggle.on("click", function () {
        openSearch();
    });

    $searchClose.on("click", function () {
        closeSearch();
    });

    $searchOverlay.on("click", function (event) {
        if ($(event.target).is("#rkSearchOverlay")) {
            closeSearch();
        }
    });

    $(".rk-mobile-submenu-toggle").on("click", function () {
        const $button = $(this);
        const $menuItem = $button.closest(".rk-mobile-menu-item");
        const $submenu = $menuItem.children(".rk-mobile-submenu");

        $button.toggleClass("active");
        $submenu.stop(true, true).slideToggle(250);
    });

    $(".rk-mobile-child-toggle").on("click", function () {
        const $button = $(this);
        const $submenuItem = $button.closest("li");
        const $childMenu = $submenuItem.children(".rk-mobile-childmenu");

        $button.toggleClass("active");
        $childMenu.stop(true, true).slideToggle(250);
    });

    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeMobileDrawer();
            closeSearch();
        }
    });

    $window.on("scroll", handleStickyHeader);

    handleStickyHeader();
})(jQuery);
