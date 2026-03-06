;; PayStream Escrow Contract
;; Time-based escrow for streaming micropayments
;; Payer deposits SIP-010 tokens which are released per-block to payee

;; ─── Constants ──────────────────────────────────────────────────────────────────

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-INSUFFICIENT-FUNDS (err u1001))
(define-constant ERR-STREAM-NOT-FOUND (err u1002))
(define-constant ERR-STREAM-EXPIRED (err u1003))
(define-constant ERR-ALREADY-SETTLED (err u1004))
(define-constant ERR-INVALID-PARAMS (err u1005))
(define-constant ERR-ZERO-AMOUNT (err u1006))

;; ─── Data Vars ──────────────────────────────────────────────────────────────────

(define-data-var stream-counter uint u0)

;; ─── Data Maps ──────────────────────────────────────────────────────────────────

(define-map streams
  { stream-id: uint }
  {
    payer: principal,
    payee: principal,
    token-contract: principal,
    total-deposited: uint,
    rate-per-block: uint,
    start-block: uint,
    end-block: uint,
    withdrawn: uint,
    settled: bool
  }
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

;; Create a new payment stream
;; Deposits tokens into escrow, releases them per-block to payee
(define-public (create-stream
    (payee principal)
    (token <sip-010-trait>)
    (total-amount uint)
    (duration-blocks uint)
  )
  (let (
    (stream-id (+ (var-get stream-counter) u1))
    (rate (/ total-amount duration-blocks))
  )
    ;; Validate inputs
    (asserts! (> total-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (> duration-blocks u0) ERR-INVALID-PARAMS)
    (asserts! (not (is-eq tx-sender payee)) ERR-INVALID-PARAMS)
    
    ;; Transfer tokens from payer to this contract (escrow)
    (try! (contract-call? token transfer total-amount tx-sender (as-contract tx-sender) none))
    
    ;; Create stream record
    (map-set streams
      { stream-id: stream-id }
      {
        payer: tx-sender,
        payee: payee,
        token-contract: (contract-of token),
        total-deposited: total-amount,
        rate-per-block: rate,
        start-block: stacks-block-height,
        end-block: (+ stacks-block-height duration-blocks),
        withdrawn: u0,
        settled: false
      }
    )
    
    ;; Increment counter
    (var-set stream-counter stream-id)
    (print {
      event: "stream-created",
      stream-id: stream-id,
      payer: tx-sender,
      payee: payee,
      amount: total-amount,
      duration: duration-blocks,
      rate: rate
    })
    (ok stream-id)
  )
)

;; Payee withdraws accrued payment from an active stream
(define-public (withdraw (stream-id uint) (token <sip-010-trait>))
  (let (
    (stream (unwrap! (map-get? streams { stream-id: stream-id }) ERR-STREAM-NOT-FOUND))
    (accrued (calculate-accrued stream-id))
    (withdrawable (- accrued (get withdrawn stream)))
  )
    ;; Only payee can withdraw
    (asserts! (is-eq tx-sender (get payee stream)) ERR-NOT-AUTHORIZED)
    (asserts! (> withdrawable u0) ERR-INSUFFICIENT-FUNDS)
    (asserts! (not (get settled stream)) ERR-ALREADY-SETTLED)
    
    ;; Transfer accrued tokens to payee
    (try! (as-contract (contract-call? token transfer withdrawable tx-sender (get payee stream) none)))
    
    ;; Update withdrawn amount
    (map-set streams
      { stream-id: stream-id }
      (merge stream { withdrawn: (+ (get withdrawn stream) withdrawable) })
    )
    
    (print {
      event: "stream-withdrawal",
      stream-id: stream-id,
      payee: (get payee stream),
      amount: withdrawable,
      total-withdrawn: (+ (get withdrawn stream) withdrawable)
    })
    (ok withdrawable)
  )
)

;; Settle a stream — pay remaining to payee, refund rest to payer
;; Can be called by payer (early termination) or anyone (after expiry)
(define-public (settle-stream (stream-id uint) (token <sip-010-trait>))
  (let (
    (stream (unwrap! (map-get? streams { stream-id: stream-id }) ERR-STREAM-NOT-FOUND))
    (accrued (calculate-accrued stream-id))
    (payee-owed (- accrued (get withdrawn stream)))
    (refund (- (get total-deposited stream) accrued))
  )
    ;; Only payer or after expiry
    (asserts! (or 
      (is-eq tx-sender (get payer stream))
      (is-eq tx-sender (get payee stream))
      (>= stacks-block-height (get end-block stream))
    ) ERR-NOT-AUTHORIZED)
    (asserts! (not (get settled stream)) ERR-ALREADY-SETTLED)
    
    ;; Pay remaining owed to payee
    (if (> payee-owed u0)
      (try! (as-contract (contract-call? token transfer payee-owed tx-sender (get payee stream) none)))
      true
    )
    
    ;; Refund remaining to payer
    (if (> refund u0)
      (try! (as-contract (contract-call? token transfer refund tx-sender (get payer stream) none)))
      true
    )
    
    ;; Mark as settled
    (map-set streams
      { stream-id: stream-id }
      (merge stream { 
        settled: true,
        withdrawn: accrued 
      })
    )
    
    (print {
      event: "stream-settled",
      stream-id: stream-id,
      payee-received: payee-owed,
      payer-refund: refund,
      total-consumed: accrued
    })
    (ok { payee-received: payee-owed, payer-refund: refund })
  )
)

;; ─── Read-only Functions ────────────────────────────────────────────────────────

;; Calculate accrued amount based on elapsed blocks
(define-read-only (calculate-accrued (stream-id uint))
  (let (
    (stream (unwrap-panic (map-get? streams { stream-id: stream-id })))
    (current (if (< stacks-block-height (get end-block stream))
                 stacks-block-height
                 (get end-block stream)))
    (elapsed (- current (get start-block stream)))
  )
    (if (> (* elapsed (get rate-per-block stream)) (get total-deposited stream))
      (get total-deposited stream)
      (* elapsed (get rate-per-block stream))
    )
  )
)

;; Get stream details
(define-read-only (get-stream (stream-id uint))
  (map-get? streams { stream-id: stream-id })
)

;; Get the current stream counter
(define-read-only (get-stream-count)
  (var-get stream-counter)
)

;; Get withdrawable amount for a stream
(define-read-only (get-withdrawable (stream-id uint))
  (let (
    (stream (unwrap-panic (map-get? streams { stream-id: stream-id })))
    (accrued (calculate-accrued stream-id))
  )
    (- accrued (get withdrawn stream))
  )
)

;; Check if a stream is active
(define-read-only (is-stream-active (stream-id uint))
  (match (map-get? streams { stream-id: stream-id })
    stream (and
      (not (get settled stream))
      (< stacks-block-height (get end-block stream))
    )
    false
  )
)
