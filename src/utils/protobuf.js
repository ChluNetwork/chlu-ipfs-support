
module.exports = `
    message PoPR {
        message ReviewAttribute {
            required string name = 1;
            required uint32 min_rating = 2;
            required uint32 max_rating = 3;
            required string description = 4;
            required bool is_required = 5;
        }
        optional string item_id = 1;
        optional string invoice_id = 2;
        optional string customer_id = 3;
        optional uint64 created_at = 4;
        optional uint64 expires_at = 5;
        required string currency_symbol = 6;
        required int32 amount = 7;
        optional string marketplace_url = 8;
        optional string marketplace_vendor_url = 9;
        required string key_location = 10;
        required uint32 chlu_version = 11;
        repeated ReviewAttribute attributes = 12;
        required string signature = 13;
        required string vendor_key_location = 14;
        required string vendor_encryption_key_location = 15;
        required string vendor_signature = 16;
        required string marketplace_signature = 17;
    }
  
    message ReviewRecord {
        message DetailedReview {
            required string attribute = 1;
            required string review_text = 2;
            required uint32 rating = 3;
        }
        required string currency_symbol = 1;
        required int32 amount = 2;
        required string customer_address = 3;
        required string vendor_address = 4;
        optional string review_text = 5;
        optional uint32 rating = 6;
        repeated DetailedReview detailed_review = 7;
        required PoPR popr = 8;
        required uint32 chlu_version = 9;
        optional string last_reviewrecord_multihash = 11;
        required string hash = 12;
        required string signature = 13;
        required string key_location = 14;
        optional string previous_version_multihash = 15;
    }

    message TransactionOutput {
        required uint32 index = 1;
        optional string multihash = 2;
    }

    message Transaction {
        repeated TransactionOutput outputs = 1;
        required uint32 chlu_version = 2;
    }
`;