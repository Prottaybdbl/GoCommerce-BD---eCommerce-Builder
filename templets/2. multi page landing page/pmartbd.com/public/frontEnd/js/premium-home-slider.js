(function ($) {
    "use strict";

    $(document).ready(function () {
        const $slider = $("#premiumHomeSlider");
        const $currentSlide = $("#phsCurrentSlide");

        if (!$slider.length) {
            return;
        }

        if (typeof $.fn.owlCarousel !== "function") {
            console.error(
                "Owl Carousel is not loaded. Load owl.carousel.min.js before premium-home-slider.js."
            );
            return;
        }

        $slider.owlCarousel({
            items: 1,
            loop: $slider.children().length > 1,
            margin: 0,
            dots: $slider.children().length > 1,
            nav: false,
            autoplay: $slider.children().length > 1,
            autoplayTimeout: 6000,
            autoplaySpeed: 900,
            smartSpeed: 900,
            autoplayHoverPause: true,
            mouseDrag: true,
            touchDrag: true
        });

        $slider.on("changed.owl.carousel", function (event) {
            const totalItems = event.item.count || 1;
            const cloneCount = event.relatedTarget._clones
                ? event.relatedTarget._clones.length / 2
                : 0;

            const currentIndex =
                ((event.item.index - cloneCount) % totalItems + totalItems) %
                    totalItems +
                1;

            if ($currentSlide.length) {
                $currentSlide.text(
                    String(currentIndex).padStart(2, "0")
                );
            }
        });

        $(".phs-slider-prev").on("click", function () {
            $slider.trigger("prev.owl.carousel");
        });

        $(".phs-slider-next").on("click", function () {
            $slider.trigger("next.owl.carousel");
        });
    });
})(jQuery);