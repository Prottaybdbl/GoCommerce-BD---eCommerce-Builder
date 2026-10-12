(function ($) {
    "use strict";

    $(document).ready(function () {
        if (!window.premiumCartRoutes) {
            console.error("Premium cart routes are missing.");
            return;
        }

        let activeRequest = null;

        function showError(message) {
            if (
                window.toastr &&
                typeof window.toastr.error === "function"
            ) {
                window.toastr.error(message);
                return;
            }

            console.error(message);
        }

        function updateCartCounters(count) {
            const cartCount = Number(count || 0);

            $("#cart-qty").text(cartCount);
            $(".mobilecart-qty").text(cartCount);

            $(".pcart-header-count strong").text(cartCount);

            $(".pcart-header-count span").text(
                cartCount === 1 ? "Item" : "Items"
            );
        }

        function renderCartResponse(response) {
            if (!response || response.status !== true) {
                showError(
                    response?.message ||
                    "Cart could not be updated."
                );

                return;
            }

            if (typeof response.html !== "string") {
                console.error(
                    "Cart HTML missing from response:",
                    response
                );

                showError("Invalid cart response.");
                return;
            }

            /*
             * Updated partial একই #cartlist-এর ভিতরে বসবে।
             */
            $("#cartlist").html(response.html);

            updateCartCounters(response.cart_count);

            /*
             * Browser যেন পুরোনো DOM height ধরে blank না রাখে।
             */
            $("#cartlist").removeAttr("style");
        }

        function sendCartRequest(url, rowId, $button) {
            if (!url || !rowId) {
                return;
            }

            /*
             * আগের request চললে নতুন duplicate request পাঠাব না।
             */
            if (activeRequest) {
                return;
            }

            $button
                .prop("disabled", true)
                .addClass("is-loading");

            activeRequest = $.ajax({
                type: "GET",
                url: url,
                dataType: "json",

                data: {
                    id: rowId
                },

                success: function (response) {
                    renderCartResponse(response);
                },

                error: function (xhr) {
                    console.error(
                        "Cart request error:",
                        xhr.responseJSON ||
                        xhr.responseText
                    );

                    showError(
                        xhr.responseJSON?.message ||
                        "Cart could not be updated."
                    );
                },

                complete: function () {
                    activeRequest = null;

                    $button
                        .prop("disabled", false)
                        .removeClass("is-loading");
                }
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CART PAGE REMOVE
        |--------------------------------------------------------------------------
        |
        | #cartlist ব্যবহার করার কারণে header popup cart-এর remove handler
        | এই cart-page button ধরতে পারবে না।
        |
        */

        $(document)
            .off(
                "click.premiumCartRemove",
                "#cartlist .cart_remove"
            )
            .on(
                "click.premiumCartRemove",
                "#cartlist .cart_remove",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    const $button = $(this);

                    const rowId = String(
                        $button.attr("data-id") || ""
                    );

                    sendCartRequest(
                        window.premiumCartRoutes.remove,
                        rowId,
                        $button
                    );
                }
            );

        /*
        |--------------------------------------------------------------------------
        | CART PAGE INCREMENT
        |--------------------------------------------------------------------------
        */

        $(document)
            .off(
                "click.premiumCartIncrement",
                "#cartlist .cart_increment"
            )
            .on(
                "click.premiumCartIncrement",
                "#cartlist .cart_increment",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    const $button = $(this);

                    const rowId = String(
                        $button.attr("data-id") || ""
                    );

                    sendCartRequest(
                        window.premiumCartRoutes.increment,
                        rowId,
                        $button
                    );
                }
            );

        /*
        |--------------------------------------------------------------------------
        | CART PAGE DECREMENT
        |--------------------------------------------------------------------------
        */

        $(document)
            .off(
                "click.premiumCartDecrement",
                "#cartlist .cart_decrement"
            )
            .on(
                "click.premiumCartDecrement",
                "#cartlist .cart_decrement",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    const $button = $(this);

                    const rowId = String(
                        $button.attr("data-id") || ""
                    );

                    sendCartRequest(
                        window.premiumCartRoutes.decrement,
                        rowId,
                        $button
                    );
                }
            );
    });
})(jQuery);