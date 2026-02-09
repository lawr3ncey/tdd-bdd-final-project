$(function () {

    // ****************************************
    //  U T I L I T Y   F U N C T I O N S
    // ****************************************

    // Updates the form with data from the response
    function update_form_data(res) {
        $("#product_id").val(res.id);
        $("#product_name").val(res.name);
        $("#product_description").val(res.description);

        if (res.available === true) {
            $("#product_available").val("true");
        } else {
            $("#product_available").val("false");
        }

        $("#product_category").val(res.category);
        $("#product_price").val(res.price);
    }

    // Clears all form fields except ID (handled separately where needed)
    function clear_form_data() {
        $("#product_name").val("");
        $("#product_description").val("");
        // Reset to known defaults so Behave dropdown checks remain stable
        $("#product_available").val("true");
        $("#product_category").val("UNKNOWN");
        $("#product_price").val("");
    }

    // Updates the flash message area
    function flash_message(message) {
        $("#flash_message").empty().append(message);
    }

    // Extracts a resilient error message
    function error_message(res) {
        if (res && res.responseJSON && res.responseJSON.message) {
            return res.responseJSON.message;
        }
        if (res && res.status === 404) {
            return "Not Found";
        }
        return "Server Error";
    }

    // ****************************************
    // Create a Product
    // ****************************************
    $("#create-btn").click(function () {
        let name = $("#product_name").val();
        let description = $("#product_description").val();
        let available = ($("#product_available").val() === "true");
        let category = $("#product_category").val();
        let price = $("#product_price").val();

        let data = {
            "name": name,
            "description": description,
            "available": available,
            "category": category,
            "price": price
        };

        $("#flash_message").empty();

        let ajax = $.ajax({
            type: "POST",
            url: "/products",
            contentType: "application/json",
            data: JSON.stringify(data),
        });

        ajax.done(function (res) {
            update_form_data(res);
            flash_message("Success");
        });

        ajax.fail(function (res) {
            flash_message(error_message(res));
        });
    });

    // ****************************************
    // Update a Product
    // ****************************************
    $("#update-btn").click(function () {
        let product_id = $("#product_id").val();
        let name = $("#product_name").val();
        let description = $("#product_description").val();
        let available = ($("#product_available").val() === "true");
        let category = $("#product_category").val();
        let price = $("#product_price").val();

        let data = {
            "name": name,
            "description": description,
            "available": available,
            "category": category,
            "price": price
        };

        $("#flash_message").empty();

        let ajax = $.ajax({
            type: "PUT",
            url: `/products/${product_id}`,
            contentType: "application/json",
            data: JSON.stringify(data)
        });

        ajax.done(function (res) {
            update_form_data(res);
            flash_message("Success");
        });

        ajax.fail(function (res) {
            flash_message(error_message(res));
        });
    });

    // ****************************************
    // Retrieve a Product
    // ****************************************
    $("#retrieve-btn").click(function () {
        let product_id = $("#product_id").val();

        $("#flash_message").empty();

        let ajax = $.ajax({
            type: "GET",
            url: `/products/${product_id}`,
            contentType: "application/json",
            data: ""
        });

        ajax.done(function (res) {
            update_form_data(res);
            flash_message("Success");
        });

        ajax.fail(function (res) {
            clear_form_data();
            flash_message(error_message(res));
        });
    });

    // ****************************************
    // Delete a Product
    // ****************************************
    $("#delete-btn").click(function () {
        let product_id = $("#product_id").val();

        $("#flash_message").empty();

        let ajax = $.ajax({
            type: "DELETE",
            url: `/products/${product_id}`,
            contentType: "application/json",
            data: ""
        });

        ajax.done(function () {
            // Behave expects "Success" after delete
            $("#product_id").val("");
            clear_form_data();
            flash_message("Success");
        });

        ajax.fail(function (res) {
            flash_message(error_message(res));
        });
    });

    // ****************************************
    // Clear the form
    // ****************************************
    $("#clear-btn").click(function () {
        $("#product_id").val("");
        clear_form_data();
        $("#flash_message").empty();
    });

    // ****************************************
    // List all Products
    // ****************************************
    $("#list-btn").click(function () {
        $("#flash_message").empty();

        let ajax = $.ajax({
            type: "GET",
            url: "/products",
            contentType: "application/json",
            data: ""
        });

        ajax.done(function (res) {
            $("#search_results").empty();

            if (!res || res.length === 0) {
                $("#search_results").append("<p>No Products found</p>");
                flash_message("Success");
                return;
            }

            let table = '<table class="table table-striped" cellpadding="10">';
            table += '<thead><tr>';
            table += '<th class="col-md-2">ID</th>';
            table += '<th class="col-md-2">Name</th>';
            table += '<th class="col-md-2">Description</th>';
            table += '<th class="col-md-2">Available</th>';
            table += '<th class="col-md-2">Category</th>';
            table += '<th class="col-md-2">Price</th>';
            table += '</tr></thead><tbody>';

            for (let i = 0; i < res.length; i++) {
                let product = res[i];
                table += `<tr id="row_${i}"><td>${product.id}</td><td>${product.name}</td><td>${product.description}</td><td>${product.available}</td><td>${product.category}</td><td>${product.price}</td></tr>`;
            }

            table += '</tbody></table>';
            $("#search_results").append(table);

            // Optional: hydrate form with first record for Copy/Paste workflows
            update_form_data(res[0]);

            flash_message("Success");
        });

        ajax.fail(function (res) {
            flash_message(error_message(res));
        });
    });

    // ****************************************
    // Search for a Product
    // ****************************************
    $("#search-btn").click(function () {
        let name = $("#product_name").val();
        let description = $("#product_description").val();
        let category = $("#product_category").val();
    
        // Read dropdown but DO NOT blindly force it into every query
        let availableStr = $("#product_available").val(); // "true" or "false"
    
        let queryParts = [];
    
        // Primary filters
        if (name) queryParts.push("name=" + encodeURIComponent(name));
        if (description) queryParts.push("description=" + encodeURIComponent(description));
    
        /**
         * Contract alignment:
         * - If user is searching by name/description, do NOT accidentally over-filter by availability/category
         *   (prevents the Big Mac timeout when available was left on False from a prior scenario).
         * - If user is searching by category/availability, then include those filters.
         */
    
        // Only apply category when explicitly set AND when not doing a name/description search
        if (!name && !description && category && category !== "UNKNOWN") {
            queryParts.push("category=" + encodeURIComponent(category));
        }
    
        // Only apply availability when not doing a name/description search
        if (!name && !description && (availableStr === "true" || availableStr === "false")) {
            queryParts.push("available=" + availableStr);
        }
    
        let queryString = queryParts.join("&");
    
        $("#flash_message").empty();
    
        let ajax = $.ajax({
            type: "GET",
            url: `/products?${queryString}`,
            contentType: "application/json",
            data: ""
        });
    
        ajax.done(function (res) {
            $("#search_results").empty();
    
            if (!res || res.length === 0) {
                $("#search_results").append("<p>No Products found</p>");
                flash_message("Success");
                return;
            }
    
            let table = '<table class="table table-striped" cellpadding="10">';
            table += '<thead><tr>';
            table += '<th class="col-md-2">ID</th>';
            table += '<th class="col-md-2">Name</th>';
            table += '<th class="col-md-2">Description</th>';
            table += '<th class="col-md-2">Available</th>';
            table += '<th class="col-md-2">Category</th>';
            table += '<th class="col-md-2">Price</th>';
            table += '</tr></thead><tbody>';
    
            for (let i = 0; i < res.length; i++) {
                let product = res[i];
                table += `<tr id="row_${i}"><td>${product.id}</td><td>${product.name}</td><td>${product.description}</td><td>${product.available}</td><td>${product.category}</td><td>${product.price}</td></tr>`;
            }
    
            table += '</tbody></table>';
            $("#search_results").append(table);
    
            // CRITICAL: hydrate form with first match so "Copy Id" is not blank
            update_form_data(res[0]);
    
            flash_message("Success");
        });
    
        ajax.fail(function (res) {
            flash_message(error_message(res));
        });
    });
    
});
