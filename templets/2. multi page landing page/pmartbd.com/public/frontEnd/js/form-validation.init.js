$(document).ready(function () {
    if (typeof $.fn.parsley !== "function") {
        return;
    }

    const $parsleyExamples = $(".parsley-examples");

    if ($parsleyExamples.length) {
        $parsleyExamples.parsley();
    }

    const $demoForm = $("#demo-form");

    if (!$demoForm.length) {
        return;
    }

    const demoFormParsley = $demoForm.parsley();

    if (!demoFormParsley) {
        return;
    }

    demoFormParsley
        .on("field:validated", function () {
            const isValid =
                $(".parsley-error").length === 0;

            $(".alert-info").toggleClass(
                "d-none",
                !isValid
            );

            $(".alert-warning").toggleClass(
                "d-none",
                isValid
            );
        })
        .on("form:submit", function () {
            return false;
        });
});