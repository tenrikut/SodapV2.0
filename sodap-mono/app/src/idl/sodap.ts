/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sodap.json`.
 */
export type Sodap = {
  "address": "9HYgQUotQqJ9muAbFbJ5Ck8n5SCrdf3KMaSa1iUGsrb6",
  "metadata": {
    "name": "sodap",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addPlatformAdmin",
      "discriminator": [
        161,
        172,
        63,
        212,
        254,
        209,
        243,
        34
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "adminPubkey",
          "type": "pubkey"
        },
        {
          "name": "adminName",
          "type": "string"
        },
        {
          "name": "rootPassword",
          "type": "string"
        }
      ]
    },
    {
      "name": "addStoreAdmin",
      "discriminator": [
        198,
        151,
        163,
        65,
        104,
        162,
        70,
        38
      ],
      "accounts": [
        {
          "name": "store",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "storeId",
          "type": "pubkey"
        },
        {
          "name": "adminPubkey",
          "type": "pubkey"
        },
        {
          "name": "role",
          "type": {
            "defined": {
              "name": "adminRoleType"
            }
          }
        }
      ]
    },
    {
      "name": "awardReferralBonus",
      "discriminator": [
        89,
        109,
        242,
        235,
        217,
        12,
        222,
        3
      ],
      "accounts": [
        {
          "name": "loyaltyAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "store"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true,
          "relations": [
            "loyaltyAccount"
          ]
        },
        {
          "name": "loyaltyProgram",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "transactionRecord",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "loyaltyAccount"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "referredUser",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "createBnplLoan",
      "discriminator": [
        204,
        183,
        89,
        134,
        116,
        97,
        232,
        137
      ],
      "accounts": [
        {
          "name": "loan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  110,
                  112,
                  108,
                  95,
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "loanId"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true
        },
        {
          "name": "borrower",
          "writable": true,
          "signer": true
        },
        {
          "name": "creditScore",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116,
                  95,
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "loanId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "totalAmount",
          "type": "u64"
        },
        {
          "name": "downpayment",
          "type": "u64"
        },
        {
          "name": "term",
          "type": {
            "defined": {
              "name": "bnplTerm"
            }
          }
        },
        {
          "name": "purchaseReceipt",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "createOrUpdateUserProfile",
      "discriminator": [
        179,
        73,
        133,
        221,
        229,
        96,
        217,
        31
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "userId",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "name",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "email",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "phone",
          "type": {
            "option": "string"
          }
        }
      ]
    },
    {
      "name": "createUserWallet",
      "discriminator": [
        86,
        213,
        225,
        48,
        56,
        62,
        72,
        148
      ],
      "accounts": [
        {
          "name": "userProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "deactivateProduct",
      "discriminator": [
        94,
        118,
        5,
        80,
        69,
        37,
        75,
        96
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "productId",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "earnLoyaltyPoints",
      "discriminator": [
        200,
        87,
        64,
        83,
        114,
        155,
        255,
        102
      ],
      "accounts": [
        {
          "name": "loyaltyAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "store"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true,
          "relations": [
            "loyaltyAccount"
          ]
        },
        {
          "name": "loyaltyProgram",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "transactionRecord",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "loyaltyAccount"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "purchaseAmount",
          "type": "u64"
        },
        {
          "name": "pointType",
          "type": {
            "defined": {
              "name": "loyaltyPointType"
            }
          }
        }
      ]
    },
    {
      "name": "giftLoyaltyPoints",
      "discriminator": [
        150,
        59,
        60,
        46,
        116,
        82,
        1,
        250
      ],
      "accounts": [
        {
          "name": "senderLoyaltyAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "store"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "recipientLoyaltyAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "store"
              },
              {
                "kind": "account",
                "path": "recipient"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true,
          "relations": [
            "senderLoyaltyAccount",
            "recipientLoyaltyAccount"
          ]
        },
        {
          "name": "loyaltyProgram",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "senderTransaction",
          "writable": true,
          "signer": true
        },
        {
          "name": "recipientTransaction",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "recipient"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pointsToGift",
          "type": "u64"
        },
        {
          "name": "message",
          "type": "string"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeCreditScore",
      "discriminator": [
        69,
        226,
        50,
        114,
        174,
        210,
        23,
        38
      ],
      "accounts": [
        {
          "name": "creditScore",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116,
                  95,
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeLoyaltyAccount",
      "discriminator": [
        220,
        66,
        180,
        186,
        185,
        39,
        182,
        230
      ],
      "accounts": [
        {
          "name": "loyaltyAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "store"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true
        },
        {
          "name": "loyaltyProgram",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "referralCode",
          "type": {
            "option": {
              "array": [
                "u8",
                8
              ]
            }
          }
        },
        {
          "name": "referredBy",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "initializeLoyaltyProgram",
      "discriminator": [
        230,
        127,
        27,
        96,
        110,
        228,
        48,
        22
      ],
      "accounts": [
        {
          "name": "loyaltyProgram",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true
        },
        {
          "name": "storeOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pointsPerDollar",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "redemptionRate",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "welcomeBonus",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "referralBonus",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "liquidateBnplLoan",
      "discriminator": [
        228,
        174,
        160,
        155,
        222,
        102,
        24,
        27
      ],
      "accounts": [
        {
          "name": "loan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  110,
                  112,
                  108,
                  95,
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "loan.borrower",
                "account": "bnplLoan"
              },
              {
                "kind": "account",
                "path": "loan.loan_id",
                "account": "bnplLoan"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true
        },
        {
          "name": "liquidator",
          "writable": true,
          "signer": true
        },
        {
          "name": "creditScore",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116,
                  95,
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "loan.borrower",
                "account": "bnplLoan"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "makeBnplPayment",
      "discriminator": [
        105,
        37,
        96,
        54,
        37,
        105,
        4,
        205
      ],
      "accounts": [
        {
          "name": "loan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  110,
                  112,
                  108,
                  95,
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "loan.loan_id",
                "account": "bnplLoan"
              }
            ]
          }
        },
        {
          "name": "paymentRecord",
          "writable": true
        },
        {
          "name": "store",
          "writable": true,
          "relations": [
            "loan"
          ]
        },
        {
          "name": "borrower",
          "writable": true,
          "signer": true,
          "relations": [
            "loan"
          ]
        },
        {
          "name": "creditScore",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116,
                  95,
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              }
            ]
          }
        },
        {
          "name": "storeOwner",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "purchaseCart",
      "discriminator": [
        196,
        33,
        229,
        130,
        137,
        89,
        154,
        199
      ],
      "accounts": [
        {
          "name": "store",
          "writable": true
        },
        {
          "name": "receipt",
          "writable": true,
          "signer": true
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "storeOwner",
          "writable": true
        },
        {
          "name": "escrowAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "productIds",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "quantities",
          "type": {
            "vec": "u64"
          }
        },
        {
          "name": "totalAmountPaid",
          "type": "u64"
        },
        {
          "name": "paymentMethod",
          "type": {
            "defined": {
              "name": "paymentMethod"
            }
          }
        },
        {
          "name": "bnplTerm",
          "type": {
            "option": {
              "defined": {
                "name": "bnplTerm"
              }
            }
          }
        },
        {
          "name": "loyaltyPointsToUse",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "redeemLoyaltyPoints",
      "discriminator": [
        187,
        195,
        185,
        155,
        179,
        96,
        149,
        0
      ],
      "accounts": [
        {
          "name": "loyaltyAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "store"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true,
          "relations": [
            "loyaltyAccount"
          ]
        },
        {
          "name": "loyaltyProgram",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "transactionRecord",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "loyaltyAccount"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pointsToRedeem",
          "type": "u64"
        },
        {
          "name": "totalPurchaseAmount",
          "type": "u64"
        }
      ],
      "returns": "u64"
    },
    {
      "name": "refundFromEscrow",
      "discriminator": [
        52,
        190,
        158,
        62,
        194,
        173,
        200,
        247
      ],
      "accounts": [
        {
          "name": "store",
          "writable": true
        },
        {
          "name": "storeOwner",
          "signer": true
        },
        {
          "name": "buyer",
          "writable": true
        },
        {
          "name": "escrowAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "registerProduct",
      "discriminator": [
        224,
        97,
        195,
        220,
        124,
        218,
        78,
        43
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "productId",
          "type": "pubkey"
        },
        {
          "name": "storeId",
          "type": "pubkey"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "imageUri",
          "type": "string"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "inventory",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "attributes",
          "type": {
            "vec": {
              "defined": {
                "name": "productAttribute"
              }
            }
          }
        }
      ]
    },
    {
      "name": "registerStore",
      "discriminator": [
        63,
        55,
        152,
        6,
        167,
        127,
        89,
        129
      ],
      "accounts": [
        {
          "name": "store",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "logoUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "releaseEscrow",
      "discriminator": [
        146,
        253,
        129,
        233,
        20,
        145,
        181,
        206
      ],
      "accounts": [
        {
          "name": "store",
          "writable": true
        },
        {
          "name": "storeOwner",
          "writable": true
        },
        {
          "name": "escrowAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "removePlatformAdmin",
      "discriminator": [
        182,
        87,
        52,
        81,
        16,
        1,
        172,
        34
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "adminPubkey",
          "type": "pubkey"
        },
        {
          "name": "rootPassword",
          "type": "string"
        }
      ]
    },
    {
      "name": "removeStoreAdmin",
      "discriminator": [
        20,
        178,
        174,
        192,
        18,
        15,
        252,
        96
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "storeId",
          "type": "pubkey"
        },
        {
          "name": "adminPubkey",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "scanAndPurchase",
      "discriminator": [
        123,
        177,
        142,
        160,
        80,
        85,
        135,
        57
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "productIds",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "quantities",
          "type": {
            "vec": "u64"
          }
        },
        {
          "name": "userId",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateLoanStatus",
      "discriminator": [
        213,
        206,
        77,
        146,
        161,
        18,
        235,
        181
      ],
      "accounts": [
        {
          "name": "loan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  110,
                  112,
                  108,
                  95,
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "loan.loan_id",
                "account": "bnplLoan"
              }
            ]
          }
        },
        {
          "name": "paymentRecord",
          "writable": true
        },
        {
          "name": "store",
          "writable": true,
          "relations": [
            "loan"
          ]
        },
        {
          "name": "borrower",
          "writable": true,
          "signer": true,
          "relations": [
            "loan"
          ]
        },
        {
          "name": "creditScore",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116,
                  95,
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              }
            ]
          }
        },
        {
          "name": "storeOwner",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateLoyaltyProgram",
      "discriminator": [
        59,
        205,
        189,
        151,
        32,
        89,
        0,
        147
      ],
      "accounts": [
        {
          "name": "loyaltyProgram",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "store",
          "writable": true,
          "relations": [
            "loyaltyProgram"
          ]
        },
        {
          "name": "storeOwner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "pointsPerDollar",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "redemptionRate",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "welcomeBonus",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "referralBonus",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "minRedemption",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "maxRedemptionPercent",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "isActive",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "updateProduct",
      "discriminator": [
        139,
        180,
        241,
        126,
        123,
        240,
        13,
        224
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "productId",
          "type": "pubkey"
        },
        {
          "name": "name",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "description",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "imageUri",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "price",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "inventory",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "attributes",
          "type": {
            "option": {
              "vec": {
                "defined": {
                  "name": "productAttribute"
                }
              }
            }
          }
        }
      ]
    },
    {
      "name": "updateStore",
      "discriminator": [
        169,
        49,
        137,
        251,
        233,
        234,
        172,
        103
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "storeId",
          "type": "pubkey"
        },
        {
          "name": "name",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "description",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "logoUri",
          "type": {
            "option": "string"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bnplCreditScore",
      "discriminator": [
        122,
        172,
        116,
        202,
        98,
        152,
        168,
        90
      ]
    },
    {
      "name": "bnplLoan",
      "discriminator": [
        203,
        42,
        61,
        144,
        187,
        95,
        144,
        207
      ]
    },
    {
      "name": "bnplPayment",
      "discriminator": [
        232,
        36,
        218,
        246,
        42,
        238,
        12,
        73
      ]
    },
    {
      "name": "escrow",
      "discriminator": [
        31,
        213,
        123,
        187,
        186,
        22,
        218,
        155
      ]
    },
    {
      "name": "loyaltyAccount",
      "discriminator": [
        246,
        246,
        248,
        155,
        190,
        53,
        91,
        126
      ]
    },
    {
      "name": "loyaltyProgram",
      "discriminator": [
        170,
        241,
        228,
        176,
        113,
        205,
        130,
        222
      ]
    },
    {
      "name": "loyaltyTransaction",
      "discriminator": [
        131,
        70,
        112,
        211,
        145,
        225,
        173,
        119
      ]
    },
    {
      "name": "purchase",
      "discriminator": [
        33,
        203,
        1,
        252,
        231,
        228,
        8,
        67
      ]
    },
    {
      "name": "store",
      "discriminator": [
        130,
        48,
        247,
        244,
        182,
        191,
        30,
        26
      ]
    },
    {
      "name": "userProfile",
      "discriminator": [
        32,
        37,
        119,
        205,
        179,
        180,
        13,
        194
      ]
    }
  ],
  "events": [
    {
      "name": "adminAdded",
      "discriminator": [
        23,
        13,
        37,
        90,
        130,
        53,
        75,
        251
      ]
    },
    {
      "name": "adminRemoved",
      "discriminator": [
        59,
        133,
        36,
        27,
        156,
        79,
        75,
        146
      ]
    },
    {
      "name": "bnplLoanCompleted",
      "discriminator": [
        197,
        8,
        152,
        219,
        95,
        232,
        250,
        32
      ]
    },
    {
      "name": "bnplLoanCreated",
      "discriminator": [
        18,
        230,
        3,
        239,
        48,
        75,
        242,
        61
      ]
    },
    {
      "name": "bnplLoanDefaulted",
      "discriminator": [
        157,
        97,
        79,
        191,
        70,
        102,
        199,
        197
      ]
    },
    {
      "name": "bnplPaymentMade",
      "discriminator": [
        155,
        117,
        119,
        216,
        72,
        28,
        73,
        255
      ]
    },
    {
      "name": "cartPurchased",
      "discriminator": [
        224,
        208,
        17,
        224,
        206,
        127,
        200,
        205
      ]
    },
    {
      "name": "loyaltyPointsEarned",
      "discriminator": [
        124,
        20,
        28,
        29,
        94,
        218,
        175,
        31
      ]
    },
    {
      "name": "loyaltyPointsGifted",
      "discriminator": [
        108,
        47,
        90,
        179,
        205,
        87,
        180,
        174
      ]
    },
    {
      "name": "loyaltyPointsRedeemed",
      "discriminator": [
        23,
        105,
        3,
        227,
        115,
        164,
        155,
        2
      ]
    },
    {
      "name": "loyaltyProgramUpdated",
      "discriminator": [
        90,
        135,
        38,
        0,
        135,
        100,
        6,
        187
      ]
    },
    {
      "name": "loyaltyTierChanged",
      "discriminator": [
        60,
        97,
        74,
        248,
        173,
        2,
        253,
        63
      ]
    },
    {
      "name": "platformAdminAdded",
      "discriminator": [
        231,
        252,
        87,
        10,
        68,
        133,
        55,
        246
      ]
    },
    {
      "name": "platformAdminRemoved",
      "discriminator": [
        253,
        234,
        128,
        75,
        56,
        254,
        40,
        79
      ]
    },
    {
      "name": "purchaseCompleted",
      "discriminator": [
        166,
        14,
        235,
        151,
        212,
        162,
        21,
        41
      ]
    },
    {
      "name": "storeRegistered",
      "discriminator": [
        8,
        21,
        234,
        141,
        147,
        227,
        16,
        145
      ]
    },
    {
      "name": "storeUpdated",
      "discriminator": [
        218,
        7,
        142,
        56,
        57,
        63,
        185,
        211
      ]
    },
    {
      "name": "userProfileUpdated",
      "discriminator": [
        137,
        227,
        236,
        168,
        126,
        29,
        3,
        132
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "tooManyAdmins",
      "msg": "Too many admins. Maximum allowed is 10"
    },
    {
      "code": 6001,
      "name": "invalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6002,
      "name": "invalidStock",
      "msg": "Invalid stock"
    },
    {
      "code": 6003,
      "name": "outOfStock",
      "msg": "Product is out of stock"
    },
    {
      "code": 6004,
      "name": "insufficientPayment",
      "msg": "Insufficient payment"
    },
    {
      "code": 6005,
      "name": "stockUnderflow",
      "msg": "Stock underflow"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6007,
      "name": "cartEmpty",
      "msg": "Cart is empty"
    },
    {
      "code": 6008,
      "name": "invalidCart",
      "msg": "Invalid cart (mismatched product and quantity arrays)"
    },
    {
      "code": 6009,
      "name": "productNotFound",
      "msg": "Product not found"
    },
    {
      "code": 6010,
      "name": "insufficientStock",
      "msg": "Insufficient stock"
    },
    {
      "code": 6011,
      "name": "priceOverflow",
      "msg": "Price overflow when summing cart"
    },
    {
      "code": 6012,
      "name": "cartTooLarge",
      "msg": "Cart too large"
    },
    {
      "code": 6013,
      "name": "adminAlreadyExists",
      "msg": "Admin already exists"
    },
    {
      "code": 6014,
      "name": "cannotRemoveOwner",
      "msg": "Cannot remove owner"
    },
    {
      "code": 6015,
      "name": "storeNotFound",
      "msg": "Store not found"
    },
    {
      "code": 6016,
      "name": "unauthorizedStoreAccess",
      "msg": "Unauthorized store access"
    },
    {
      "code": 6017,
      "name": "adminNotFound",
      "msg": "Admin not found"
    },
    {
      "code": 6018,
      "name": "userNotFound",
      "msg": "User not found"
    },
    {
      "code": 6019,
      "name": "arithmeticError",
      "msg": "Arithmetic error"
    },
    {
      "code": 6020,
      "name": "invalidStoreId",
      "msg": "Invalid store ID"
    },
    {
      "code": 6021,
      "name": "invalidProductId",
      "msg": "Invalid product ID"
    },
    {
      "code": 6022,
      "name": "invalidAdminId",
      "msg": "Invalid admin ID"
    },
    {
      "code": 6023,
      "name": "invalidLoyaltyConfig",
      "msg": "Invalid loyalty configuration"
    },
    {
      "code": 6024,
      "name": "storeInactive",
      "msg": "Store is inactive"
    },
    {
      "code": 6025,
      "name": "insufficientLoyaltyPoints",
      "msg": "Insufficient loyalty points"
    },
    {
      "code": 6026,
      "name": "loyaltyProgramInactive",
      "msg": "Loyalty program is inactive"
    },
    {
      "code": 6027,
      "name": "invalidParameters",
      "msg": "Invalid parameters"
    },
    {
      "code": 6028,
      "name": "insufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6029,
      "name": "invalidMetadataUri",
      "msg": "Invalid metadata URI"
    },
    {
      "code": 6030,
      "name": "invalidAdminRole",
      "msg": "Invalid admin role"
    },
    {
      "code": 6031,
      "name": "invalidStore",
      "msg": "Invalid store"
    },
    {
      "code": 6032,
      "name": "escrowNotFound",
      "msg": "Escrow account not found"
    },
    {
      "code": 6033,
      "name": "loyaltyMintNotFound",
      "msg": "Loyalty mint not found"
    },
    {
      "code": 6034,
      "name": "invalidLoyaltyPoints",
      "msg": "Invalid loyalty points"
    },
    {
      "code": 6035,
      "name": "transferHookError",
      "msg": "Transfer hook error"
    },
    {
      "code": 6036,
      "name": "invalidBnplConfig",
      "msg": "Invalid BNPL configuration"
    },
    {
      "code": 6037,
      "name": "bnplLoanNotFound",
      "msg": "BNPL loan not found"
    },
    {
      "code": 6038,
      "name": "bnplPaymentNotDue",
      "msg": "BNPL payment not due yet"
    },
    {
      "code": 6039,
      "name": "bnplPaymentOverdue",
      "msg": "BNPL payment overdue"
    },
    {
      "code": 6040,
      "name": "invalidBnplPayment",
      "msg": "Invalid BNPL payment amount"
    },
    {
      "code": 6041,
      "name": "bnplLoanCompleted",
      "msg": "BNPL loan already completed"
    },
    {
      "code": 6042,
      "name": "bnplLoanDefaulted",
      "msg": "BNPL loan defaulted"
    },
    {
      "code": 6043,
      "name": "insufficientCreditScore",
      "msg": "Insufficient credit score for BNPL"
    },
    {
      "code": 6044,
      "name": "bnplTermsNotSupported",
      "msg": "BNPL terms not supported"
    },
    {
      "code": 6045,
      "name": "bnplDownpaymentRequired",
      "msg": "BNPL downpayment required"
    }
  ],
  "types": [
    {
      "name": "adminAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "storeId",
            "type": "pubkey"
          },
          {
            "name": "adminPubkey",
            "type": "pubkey"
          },
          {
            "name": "roleType",
            "type": {
              "defined": {
                "name": "adminRoleType"
              }
            }
          },
          {
            "name": "addedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "adminRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "storeId",
            "type": "pubkey"
          },
          {
            "name": "adminPubkey",
            "type": "pubkey"
          },
          {
            "name": "removedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "adminRole",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminPubkey",
            "type": "pubkey"
          },
          {
            "name": "roleType",
            "type": {
              "defined": {
                "name": "adminRoleType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "adminRoleType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "owner"
          },
          {
            "name": "manager"
          },
          {
            "name": "viewer"
          }
        ]
      }
    },
    {
      "name": "bnplCreditScore",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "score",
            "type": "u16"
          },
          {
            "name": "totalLoans",
            "type": "u16"
          },
          {
            "name": "successfulPayments",
            "type": "u16"
          },
          {
            "name": "latePayments",
            "type": "u16"
          },
          {
            "name": "defaults",
            "type": "u16"
          },
          {
            "name": "lastUpdated",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bnplLoan",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "downpayment",
            "type": "u64"
          },
          {
            "name": "remainingBalance",
            "type": "u64"
          },
          {
            "name": "installmentAmount",
            "type": "u64"
          },
          {
            "name": "interestRate",
            "type": "u16"
          },
          {
            "name": "term",
            "type": {
              "defined": {
                "name": "bnplTerm"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "bnplLoanStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "nextPaymentDue",
            "type": "i64"
          },
          {
            "name": "paymentsMade",
            "type": "u8"
          },
          {
            "name": "totalPayments",
            "type": "u8"
          },
          {
            "name": "lateFee",
            "type": "u64"
          },
          {
            "name": "gracePeriodDays",
            "type": "u8"
          },
          {
            "name": "purchaseReceipt",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "bnplLoanCompleted",
      "docs": [
        "Event emitted when a BNPL loan is completed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "completionDate",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bnplLoanCreated",
      "docs": [
        "Event emitted when a BNPL loan is created"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "term",
            "type": {
              "defined": {
                "name": "bnplTerm"
              }
            }
          },
          {
            "name": "installmentAmount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bnplLoanDefaulted",
      "docs": [
        "Event emitted when a BNPL loan defaults"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "defaultDate",
            "type": "i64"
          },
          {
            "name": "outstandingBalance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bnplLoanStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "completed"
          },
          {
            "name": "defaultedGrace"
          },
          {
            "name": "defaulted"
          },
          {
            "name": "liquidated"
          }
        ]
      }
    },
    {
      "name": "bnplPayment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "paymentNumber",
            "type": "u8"
          },
          {
            "name": "amountPaid",
            "type": "u64"
          },
          {
            "name": "lateFeePaid",
            "type": "u64"
          },
          {
            "name": "paymentDate",
            "type": "i64"
          },
          {
            "name": "wasLate",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "bnplPaymentMade",
      "docs": [
        "Event emitted when a BNPL payment is made"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "paymentNumber",
            "type": "u8"
          },
          {
            "name": "amountPaid",
            "type": "u64"
          },
          {
            "name": "remainingBalance",
            "type": "u64"
          },
          {
            "name": "paymentDate",
            "type": "i64"
          },
          {
            "name": "wasLate",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "bnplTerm",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "threeMonths"
          },
          {
            "name": "sixMonths"
          },
          {
            "name": "twelveMonths"
          }
        ]
      }
    },
    {
      "name": "cartPurchased",
      "docs": [
        "off‑chain log"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "storeId",
            "type": "pubkey"
          },
          {
            "name": "buyerId",
            "type": "pubkey"
          },
          {
            "name": "productUuids",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  16
                ]
              }
            }
          },
          {
            "name": "quantities",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "totalPaid",
            "type": "u64"
          },
          {
            "name": "gasFee",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "escrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "balance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "loyaltyAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "totalPoints",
            "type": "u64"
          },
          {
            "name": "availablePoints",
            "type": "u64"
          },
          {
            "name": "redeemedPoints",
            "type": "u64"
          },
          {
            "name": "expiredPoints",
            "type": "u64"
          },
          {
            "name": "tier",
            "type": {
              "defined": {
                "name": "loyaltyTier"
              }
            }
          },
          {
            "name": "tierProgress",
            "type": "u64"
          },
          {
            "name": "lastPurchaseDate",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "referralCode",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "referredBy",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "totalReferrals",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "loyaltyPointType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "purchase"
          },
          {
            "name": "referral"
          },
          {
            "name": "bonus"
          },
          {
            "name": "welcome"
          }
        ]
      }
    },
    {
      "name": "loyaltyPointsEarned",
      "docs": [
        "Event emitted when loyalty points are earned"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "pointsEarned",
            "type": "u64"
          },
          {
            "name": "pointType",
            "type": {
              "defined": {
                "name": "loyaltyPointType"
              }
            }
          },
          {
            "name": "newTotal",
            "type": "u64"
          },
          {
            "name": "newTier",
            "type": {
              "defined": {
                "name": "loyaltyTier"
              }
            }
          },
          {
            "name": "purchaseAmount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "loyaltyPointsGifted",
      "docs": [
        "Event emitted when loyalty points are gifted"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "pointsGifted",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "loyaltyPointsRedeemed",
      "docs": [
        "Event emitted when loyalty points are redeemed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "pointsRedeemed",
            "type": "u64"
          },
          {
            "name": "valueRedeemed",
            "type": "u64"
          },
          {
            "name": "remainingPoints",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "loyaltyProgram",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "pointsPerDollar",
            "type": "u64"
          },
          {
            "name": "redemptionRate",
            "type": "u64"
          },
          {
            "name": "welcomeBonus",
            "type": "u64"
          },
          {
            "name": "referralBonus",
            "type": "u64"
          },
          {
            "name": "minRedemption",
            "type": "u64"
          },
          {
            "name": "maxRedemptionPercent",
            "type": "u16"
          },
          {
            "name": "pointExpiryDays",
            "type": "u32"
          },
          {
            "name": "tierMultiplierEnabled",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "loyaltyProgramUpdated",
      "docs": [
        "Event emitted when loyalty program is updated"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "pointsPerDollar",
            "type": "u64"
          },
          {
            "name": "redemptionRate",
            "type": "u64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "loyaltyTier",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "bronze"
          },
          {
            "name": "silver"
          },
          {
            "name": "gold"
          },
          {
            "name": "platinum"
          }
        ]
      }
    },
    {
      "name": "loyaltyTierChanged",
      "docs": [
        "Event emitted when user's loyalty tier changes"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "oldTier",
            "type": {
              "defined": {
                "name": "loyaltyTier"
              }
            }
          },
          {
            "name": "newTier",
            "type": {
              "defined": {
                "name": "loyaltyTier"
              }
            }
          },
          {
            "name": "totalPoints",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "loyaltyTransaction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "transactionType",
            "type": {
              "defined": {
                "name": "loyaltyTransactionType"
              }
            }
          },
          {
            "name": "pointType",
            "type": {
              "defined": {
                "name": "loyaltyPointType"
              }
            }
          },
          {
            "name": "points",
            "type": "u64"
          },
          {
            "name": "purchaseAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "relatedUser",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "loyaltyTransactionType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "earned"
          },
          {
            "name": "redeemed"
          },
          {
            "name": "expired"
          },
          {
            "name": "gifted"
          },
          {
            "name": "received"
          }
        ]
      }
    },
    {
      "name": "paymentMethod",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "fullPayment"
          },
          {
            "name": "bnpl"
          }
        ]
      }
    },
    {
      "name": "platformAdminAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminPubkey",
            "type": "pubkey"
          },
          {
            "name": "addedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "platformAdminRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminPubkey",
            "type": "pubkey"
          },
          {
            "name": "removedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "productAttribute",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "value",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "purchase",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "productIds",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "quantities",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "totalPaid",
            "type": "u64"
          },
          {
            "name": "gasFee",
            "type": "u64"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "purchaseCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "store",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "logoUri",
            "type": "string"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "revenue",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "escrowBump",
            "type": "u8"
          },
          {
            "name": "adminRoles",
            "type": {
              "vec": {
                "defined": {
                  "name": "adminRole"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "storeRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "storeId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "storeUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "storeId",
            "type": "pubkey"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "userId",
            "type": "string"
          },
          {
            "name": "deliveryAddress",
            "type": "string"
          },
          {
            "name": "preferredStore",
            "type": "pubkey"
          },
          {
            "name": "totalPurchases",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "userProfileUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "walletAddress",
            "type": "pubkey"
          },
          {
            "name": "userId",
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
