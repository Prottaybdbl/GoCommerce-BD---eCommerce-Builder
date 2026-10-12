(function ($) {
    "use strict";

    $(document).ready(function () {
        const $categoryCarousel = $("#topCategoryCarousel");

        if (!$categoryCarousel.length) {
            return;
        }

        if (typeof $.fn.owlCarousel !== "function") {
            console.error(
                "Owl Carousel is required for the category carousel."
            );

            return;
        }

        const totalCategories =
            $categoryCarousel.children().length;

        $categoryCarousel.owlCarousel({
            margin: 18,

            loop: totalCategories > 4,

            dots: totalCategories > 4,

            nav: false,

            autoplay: totalCategories > 4,

            autoplayTimeout: 4500,

            autoplaySpeed: 700,

            smartSpeed: 650,

            autoplayHoverPause: true,

            mouseDrag: true,

            touchDrag: true,

            responsiveClass: true,

            responsive: {
                0: {
                    items: 3,
                    margin: 8,
                    loop: totalCategories > 3,
                    autoplay: totalCategories > 3,
                    dots: totalCategories > 3
                },

                576: {
                    items: 3,
                    margin: 12,
                    loop: totalCategories > 3,
                    autoplay: totalCategories > 3,
                    dots: totalCategories > 3
                },

                768: {
                    items: 4,
                    margin: 15,
                    loop: totalCategories > 4,
                    autoplay: totalCategories > 4,
                    dots: totalCategories > 4
                },

                1200: {
                    items: 4,
                    margin: 18,
                    loop: totalCategories > 4,
                    autoplay: totalCategories > 4,
                    dots: totalCategories > 4
                }
            }
        });

        $(".tc-nav-prev").on("click", function () {
            $categoryCarousel.trigger("prev.owl.carousel");
        });

        $(".tc-nav-next").on("click", function () {
            $categoryCarousel.trigger("next.owl.carousel");
        });
    });
})(jQuery);