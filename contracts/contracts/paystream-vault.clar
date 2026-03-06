;; PayStream Vault Contract
;; x402 exact payment processing and proof-of-payment receipts
;; Handles single-shot payments with on-chain receipt storage

;; ─── Constants ──────────────────────────────────────────────────────────────────

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u2000))
(define-constant ERR-PAYMENT-EXISTS (err u2001))
(define-constant ERR-INVALID-AMOUNT (err u2002))
(define-constant ERR-PAYMENT-NOT-FOUND (err u2003))

;; ─── Data Vars ──────────────────────────────────────────────────────────────────

(define-data-var payment-counter uint u0)
(define-data-var total-volume uint u0)

;; ─── Data Maps ──────────────────────────────────────────────────────────────────

;; Payment records — proof-of-payment on-chain
(define-map payments
  { payment-id: (buff 32) }
  {
    payer: principal,
    payee: principal,
    amount: uint,
    token-contract: principal,
    resource-hash: (buff 32),
    block-height: uint,
    timestamp: uint,
    settled: bool
  }
)

;; Merchant revenue tracking
(define-map merchant-balances
  { merchant: principal, token: principal }
  { total-received: uint, payment-count: uint }
)

;; Payment receipt index by payer
(define-map payer-payments
  { payer: principal, index: uint }
  { payment-id: (buff 32) }
)

(define-map payer-payment-count
  { payer: principal }
  { count: uint }
)

;; ─── SIP-010 Trait ──────────────────────────────────────────────────────────────

(define-trait sip-010-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)

;; ─── Public Functions ───────────────────────────────────────────────────────────

;; Process an x402 exact payment
;; Transfers tokens from payer to payee & stores receipt on-chain
(define-public (process-payment
    (payment-id (buff 32))
    (payee principal)
    (amount uint)
    (token <sip-010-trait>)
    (resource-hash (buff 32))
  )
  (begin
    ;; Validate
    (asserts! (is-none (map-get? payments { payment-id: payment-id })) ERR-PAYMENT-EXISTS)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    
    ;; Direct transfer from payer to payee
    (try! (contract-call? token transfer amount tx-sender payee none))
    
    ;; Store payment receipt
    (map-set payments
      { payment-id: payment-id }
      {
        payer: tx-sender,
        payee: payee,
        amount: amount,
        token-contract: (contract-of token),
        resource-hash: resource-hash,
        block-height: stacks-block-height,
        timestamp: stacks-block-height,
        settled: true
      }
    )
    
    ;; Update merchant balance tracking
    (let (
      (current (default-to { total-received: u0, payment-count: u0 }
        (map-get? merchant-balances { merchant: payee, token: (contract-of token) })))
    )
      (map-set merchant-balances
        { merchant: payee, token: (contract-of token) }
        { 
          total-received: (+ (get total-received current) amount),
          payment-count: (+ (get payment-count current) u1)
        }
      )
    )
    
    ;; Index by payer
    (let (
      (payer-count (default-to { count: u0 } 
        (map-get? payer-payment-count { payer: tx-sender })))
    )
      (map-set payer-payments
        { payer: tx-sender, index: (get count payer-count) }
        { payment-id: payment-id }
      )
      (map-set payer-payment-count
        { payer: tx-sender }
        { count: (+ (get count payer-count) u1) }
      )
    )
    
    ;; Update global stats
    (var-set payment-counter (+ (var-get payment-counter) u1))
    (var-set total-volume (+ (var-get total-volume) amount))
    
    (print {
      event: "payment-processed",
      payment-id: payment-id,
      payer: tx-sender,
      payee: payee,
      amount: amount,
      resource: resource-hash
    })
    (ok payment-id)
  )
)

;; Process an STX native payment (no SIP-010 trait needed)
(define-public (process-stx-payment
    (payment-id (buff 32))
    (payee principal)
    (amount uint)
    (resource-hash (buff 32))
  )
  (begin
    (asserts! (is-none (map-get? payments { payment-id: payment-id })) ERR-PAYMENT-EXISTS)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    
    ;; Direct STX transfer
    (try! (stx-transfer? amount tx-sender payee))
    
    ;; Store receipt (use contract-owner as token placeholder for STX)
    (map-set payments
      { payment-id: payment-id }
      {
        payer: tx-sender,
        payee: payee,
        amount: amount,
        token-contract: CONTRACT-OWNER,
        resource-hash: resource-hash,
        block-height: stacks-block-height,
        timestamp: stacks-block-height,
        settled: true
      }
    )
    
    ;; Update stats
    (var-set payment-counter (+ (var-get payment-counter) u1))
    (var-set total-volume (+ (var-get total-volume) amount))
    
    (print {
      event: "stx-payment-processed",
      payment-id: payment-id,
      payer: tx-sender,
      payee: payee,
      amount: amount
    })
    (ok payment-id)
  )
)

;; ─── Read-only Functions ────────────────────────────────────────────────────────

;; Verify a payment exists and get details
(define-read-only (verify-payment (payment-id (buff 32)))
  (map-get? payments { payment-id: payment-id })
)

;; Get merchant balance for a specific token
(define-read-only (get-merchant-stats (merchant principal) (token principal))
  (default-to { total-received: u0, payment-count: u0 }
    (map-get? merchant-balances { merchant: merchant, token: token })
  )
)

;; Get total payment count
(define-read-only (get-payment-count)
  (var-get payment-counter)
)

;; Get total volume processed
(define-read-only (get-total-volume)
  (var-get total-volume)
)

;; Get payer's payment count
(define-read-only (get-payer-payment-count (payer principal))
  (default-to { count: u0 }
    (map-get? payer-payment-count { payer: payer })
  )
)

;; Check if a specific payment-id has been used
(define-read-only (is-payment-id-used (payment-id (buff 32)))
  (is-some (map-get? payments { payment-id: payment-id }))
)
