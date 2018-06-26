
module.exports = `

syntax = "proto2";

message Rating {

    optional uint32 min = 1;
  
    optional uint32 max = 2;
  
    optional uint32 value = 3;
}

message Signature {

  required string type = 1;

  required uint64 created = 2;

  // the did of the signing entity
  required string creator = 3;

  required string nonce = 4;
  
  required string signatureValue = 5;
  
}

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
  
    // marketplace customer identifier
    optional string customer_id = 3;
  
    optional uint64 created_at = 4;
  
    optional uint64 expires_at = 5;
  
    // for determining the blockchain to use, should be like btc, tbtc etc
    required string currency_symbol = 6;
  
    required int32 amount = 7;
  
    optional string marketplace_url = 8;
  
    optional string marketplace_vendor_url = 9;
  
  
    // the vendor marketplace cosigned key location
    required string key_location = 10;
  
    required uint32 chlu_version = 11;
  
    repeated ReviewAttribute attributes = 12;
  
    // deprecated
    required string signature = 13;
  
    // deprecated
    required string vendor_key_location = 14;
  
    // deprecated
    required string vendor_encryption_key_location = 15;
  
    // vendor key location and vendor encryption key location should resolve from the did
    required string vendor_did = 16;
  
    required Signature sig = 17;
}


message ReviewRecord {
  
    message DetailedReview {
  
        required string attribute = 1;
  
        required string review_text = 2;
  
        required Rating rating = 3;
  
        optional string category = 4;
  
    }
  
    // identify the blockchain, should btc, tbtc, eth, etc
    required string currency_symbol = 1;
    
    required int32 amount = 2;
  
    required string customer_address = 3;
  
    required string vendor_address = 4;
  
    // goes inside a new review field
    optional string OBSOLETE_review_text = 5;
  
    // goes inside a new review field
    optional uint32 OBSOLETE_rating = 6;
    
    repeated DetailedReview detailed_review = 7;
  
    required PoPR popr = 8;
  
    required uint32 chlu_version = 9;
  
    optional string last_reviewrecord_multihash = 11;
  
    required string hash = 12;
  
    // Shouldn't be used anymore
    required string signature = 13;
  
    optional string key_location = 14;
  
    optional string previous_version_multihash = 15;
  
    // goes into the issuer field
    optional string OBSOLETE_customer_did_id = 16;
  
  
    // Supporting spec
    message Location {
  
        required float lat = 1;
  
        required float lng = 2;
    }
  
    message Subject {
  
        required string did = 1;
  
        optional string name = 2;
  
        optional string address = 3;
  
        optional string telephone = 4;
  
        repeated string categories = 5;
  
        optional Location location = 6;
  
        optional string url = 7;
    }
  
    message Platform {
  
        required string name = 1;
  
        required string url = 2;
  
        optional string subject_url = 3;
    }
  
    message Author {
  
        required string name = 1;
  
        optional string platform_url = 2;
    }
  
    message Review {
  
        required uint64 date_publised = 1;
  
        optional string url = 2;
  
        required string title = 3;
  
        optional string text = 4;
      
    }
    
    
    // timestamp when the review was issued
    required uint64 issued = 18;
  
    // the did of the entity issuing the review
    required string issuer = 19;
  
    required Subject subject = 20;
  
    required Platform platform = 21;
  
    required Author author = 22;
  
    required Review review = 23;
  
    required Rating rating_details = 24;  
  
    required bool verifiable = 25;
  
    message Verification {
  
        message Method {
            
            required string method = 1;
            
            optional string provider = 2;
        }
    
        message Proof {
    
            required Method method = 1;
    
            required string provider = 2;
    
            required Signature signature = 3;
        }    
    }
  
    optional Verification verification = 26;
  
    optional Signature issuer_signature = 27;
    
}
`;