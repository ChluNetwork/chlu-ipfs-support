"use strict";

module.exports = "\n    message PoPR {\n        message ReviewAttribute {\n            required string name = 1;\n            required uint32 min_rating = 2;\n            required uint32 max_rating = 3;\n            required string description = 4;\n            required bool is_required = 5;\n        }\n        optional string item_id = 1;\n        optional string invoice_id = 2;\n        optional string customer_id = 3;\n        optional uint64 created_at = 4;\n        optional uint64 expires_at = 5;\n        required string currency_symbol = 6;\n        required int32 amount = 7;\n        optional string marketplace_url = 8;\n        optional string marketplace_vendor_url = 9;\n        required string key_location = 10;\n        required uint32 chlu_version = 11;\n        repeated ReviewAttribute attributes = 12;\n        required string signature = 13;\n    }\n  \n    message ReviewRecord {\n        message DetailedReview {\n            required string attribute = 1;\n            required string review_text = 2;\n            required uint32 rating = 3;\n        }\n        required string currency_symbol = 1;\n        required int32 amount = 2;\n        required string customer_address = 3;\n        required string vendor_address = 4;\n        optional string review_text = 5;\n        optional uint32 rating = 6;\n        repeated DetailedReview detailed_review = 7;\n        required PoPR popr = 8;\n        required uint32 chlu_version = 9;\n        required string orbitDb = 10;\n        required string hash = 11;\n    }\n\n    message PaymentRecord {\n        required string customer_address = 1;\n        required string vendor_address = 2;\n        required int32 amount = 3;\n        required ReviewRecord review_record = 4;\n    }\n";