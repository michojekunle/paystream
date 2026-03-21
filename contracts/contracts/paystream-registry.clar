;; PayStream Registry Contract
;; Service/API registry for discovering paid endpoints
;; Enables AI agents to discover and pay for services

;; --------- Constants ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u3000))
(define-constant ERR-SERVICE-EXISTS (err u3001))
(define-constant ERR-SERVICE-NOT-FOUND (err u3002))
(define-constant ERR-INVALID-URL (err u3003))

;; --------- Data Vars ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

(define-data-var service-counter uint u0)

;; --------- Data Maps ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

;; Service registry --- available paid APIs/resources
(define-map services
  { service-id: uint }
  {
    owner: principal,
    name: (string-ascii 64),
    url: (string-ascii 256),
    description: (string-ascii 256),
    price-stx: uint,
    price-sbtc: uint,
    price-usdcx: uint,
    scheme: (string-ascii 16),
    active: bool,
    created-at: uint,
    total-calls: uint,
    total-revenue: uint
  }
)

;; Owner to service index
(define-map owner-services
  { owner: principal, index: uint }
  { service-id: uint }
)

(define-map owner-service-count
  { owner: principal }
  { count: uint }
)

;; --------- Public Functions ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

;; Register a new paid service/API
(define-public (register-service
    (name (string-ascii 64))
    (url (string-ascii 256))
    (description (string-ascii 256))
    (price-stx uint)
    (price-sbtc uint)
    (price-usdcx uint)
    (scheme (string-ascii 16))
  )
  (let (
    (service-id (+ (var-get service-counter) u1))
    (owner-count (default-to { count: u0 }
      (map-get? owner-service-count { owner: tx-sender })))
  )
    ;; Create service
    (map-set services
      { service-id: service-id }
      {
        owner: tx-sender,
        name: name,
        url: url,
        description: description,
        price-stx: price-stx,
        price-sbtc: price-sbtc,
        price-usdcx: price-usdcx,
        scheme: scheme,
        active: true,
        created-at: block-height,
        total-calls: u0,
        total-revenue: u0
      }
    )
    
    ;; Index by owner
    (map-set owner-services
      { owner: tx-sender, index: (get count owner-count) }
      { service-id: service-id }
    )
    (map-set owner-service-count
      { owner: tx-sender }
      { count: (+ (get count owner-count) u1) }
    )
    
    (var-set service-counter service-id)
    
    (print {
      event: "service-registered",
      service-id: service-id,
      owner: tx-sender,
      name: name,
      url: url,
      scheme: scheme
    })
    (ok service-id)
  )
)

;; Update service pricing
(define-public (update-pricing
    (service-id uint)
    (price-stx uint)
    (price-sbtc uint)
    (price-usdcx uint)
  )
  (let (
    (service (unwrap! (map-get? services { service-id: service-id }) ERR-SERVICE-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender (get owner service)) ERR-NOT-AUTHORIZED)
    
    (map-set services
      { service-id: service-id }
      (merge service {
        price-stx: price-stx,
        price-sbtc: price-sbtc,
        price-usdcx: price-usdcx
      })
    )
    
    (print { event: "pricing-updated", service-id: service-id })
    (ok true)
  )
)

;; Toggle service active status
(define-public (toggle-service (service-id uint))
  (let (
    (service (unwrap! (map-get? services { service-id: service-id }) ERR-SERVICE-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender (get owner service)) ERR-NOT-AUTHORIZED)
    
    (map-set services
      { service-id: service-id }
      (merge service { active: (not (get active service)) })
    )
    
    (ok (not (get active service)))
  )
)

;; Record a service call (called by the vault contract after payment)
(define-public (record-call (service-id uint) (revenue uint))
  (let (
    (service (unwrap! (map-get? services { service-id: service-id }) ERR-SERVICE-NOT-FOUND))
  )
    (map-set services
      { service-id: service-id }
      (merge service {
        total-calls: (+ (get total-calls service) u1),
        total-revenue: (+ (get total-revenue service) revenue)
      })
    )
    (ok true)
  )
)

;; --------- Read-only Functions ------------------------------------------------------------------------------------------------------------------------------------------------------------------------

;; Get service details
(define-read-only (get-service (service-id uint))
  (map-get? services { service-id: service-id })
)

;; Get service count
(define-read-only (get-service-count)
  (var-get service-counter)
)

;; Get owner's service count
(define-read-only (get-owner-service-count (owner principal))
  (default-to { count: u0 }
    (map-get? owner-service-count { owner: owner })
  )
)
