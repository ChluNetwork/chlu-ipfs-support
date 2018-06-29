
module.exports = `

    syntax = "proto3";

    message Signature {

        string type = 1;
      
        uint64 created = 2;
      
        // the did of the signing entity
        string creator = 3;
      
        string nonce = 4;
      
        string signatureValue = 5;
        
    }

    message Rating {

        uint32 min = 1;
        
        uint32 max = 2;
        
        uint32 value = 3;
    }


    message PoPR {

        message ReviewAttribute {
      
            string name = 1;
      
            uint32 min_rating = 2;
      
            uint32 max_rating = 3;    
    
            string description = 4;
      
            bool is_required = 5;
      
        }
      
        string item_id = 1;
      
        string invoice_id = 2;
      
        // marketplace customer identifier
        string customer_id = 3;
      
        uint64 created_at = 4;
      
        uint64 expires_at = 5;
      
        // for determining the blockchain to use, should be like btc, tbtc etc
        string currency_symbol = 6;
      
        int32 amount = 7;
      
        string marketplace_url = 8;
      
        string marketplace_vendor_url = 9;
      
      
        // the vendor marketplace cosigned key location
        string key_location = 10;
      
        uint32 chlu_version = 11;
      
        repeated ReviewAttribute attributes = 12;
      
        // vendor key location and vendor encryption key location should resolve from the did
        string vendor_did = 13;
      
        Signature signature = 14;
      
        Signature marketplace_signature = 15;
      
        Signature vendor_signature = 16;
    }

    message ReviewRecord {
  
        message DetailedReview {
      
            string attribute = 1;
      
            string review_text = 2;
      
            Rating rating = 3;
      
            string category = 4;
      
        }
      
        // identify the blockchain, should btc, tbtc, eth, etc
        string currency_symbol = 1;
        
        int32 amount = 2;
      
        string customer_address = 3;
      
        string vendor_address = 4;
        
        repeated DetailedReview detailed_review = 5;
      
        PoPR popr = 6;
      
        uint32 chlu_version = 7;
      
        string last_reviewrecord_multihash = 8;
      
        string hash = 9;
      
        Signature customer_signature = 10;
      
        string key_location = 11;
      
        string previous_version_multihash = 12;
      
      
        // Supporting spec
        message Location {
      
            float lat = 1;
      
            float lng = 2;
        }
      
        message Subject {
      
            string did = 1;
      
            string name = 2;
      
            string address = 3;
      
            string telephone = 4;
      
            repeated string categories = 5;
      
            Location location = 6;
      
            string url = 7;
        }
      
        message Platform {
      
            string name = 1;
      
            string url = 2;
      
            string subject_url = 3;
        }
      
        message Author {
      
            string name = 1;
      
            string platform_url = 2;
        }
      
        message Review {
      
            uint64 date_published = 1;
      
            string url = 2;
      
            string title = 3;
      
            string text = 4;
          
        }
        
        
        // timestamp when the review was issued
        uint64 issued = 13;
      
        // the did of the entity issuing the review
        string issuer = 14;
      
        Subject subject = 15;
      
        Platform platform = 16;
      
        Author author = 17;
      
        Review review = 18;
      
        Rating rating_details = 19;  
      
        bool verifiable = 20;
      
        message Verification {
      
            message Method {
            
                string method = 1;
            
                string provider = 2;
            }
      
            message Proof {
      
                Method method = 1;
      
                string provider = 2;
      
                Signature signature = 3;
            }    
        }
      
        Verification verification = 21;
      
        Signature issuer_signature = 22;
        
    }

`;