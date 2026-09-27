# TASKS.md

# Automation Health Monitor — MVP Tasks

## 0. Project Setup

* [x] Initialize project
* [x] Set up frontend
* [x] Set up backend
* [x] Set up database
* [x] Configure environment variables
* [x] Create basic project structure

---

## 1. Database

* [x] Create Workflow model
* [x] Create Execution model
* [x] Create Check model
* [x] Create Incident model
* [x] Create database migrations
* [x] Add seed/demo data

---

## 2. Workflow Management

* [x] Create workflow API
* [x] List workflows
* [x] Get workflow details
* [x] Update workflow
* [x] Delete workflow
* [x] Configure expected execution frequency

---

## 3. Execution Tracking

* [x] Create execution API
* [x] Record execution timestamp
* [x] Record execution status
* [ ] Record input summary  (only output_count/note stored — no explicit input summary field)
* [x] Record output summary
* [x] Display execution history

---

## 4. Monitoring Engine

### Heartbeat

* [x] Implement expected execution check
* [x] Detect missed execution
* [x] Mark workflow as INACTIVE
* [x] Create incident

### Output Validation

* [x] Implement required-field validation
* [x] Implement empty-output validation
* [x] Implement type validation
* [x] Implement count validation
* [x] Create incident when validation fails

### Anomaly Detection

* [x] Track historical execution data
* [x] Calculate basic baseline
* [x] Detect unusual execution volume
* [x] Detect unusual output volume
* [x] Detect unusual execution duration
* [x] Create anomaly incident

---

## 5. Silent Failure Detection

* [x] Separate technical execution status from business outcome
* [x] Detect successful execution with missing output
* [x] Detect successful execution with invalid output
* [x] Detect successful execution with abnormal output
* [x] Assign WARNING status
* [x] Show evidence for the warning

---

## 6. Incident System

* [x] Create incident model/API
* [x] Assign severity
* [x] Store detection reason
* [x] Store evidence
* [x] Show active incidents
* [x] Resolve incident
* [x] Show incident history

---

## 7. Dashboard

* [x] Create dashboard layout
* [x] Show overall health
* [x] Show workflow count
* [x] Show healthy workflows
* [x] Show warning workflows
* [x] Show failed workflows
* [x] Show inactive workflows
* [x] Show recent incidents
* [x] Show last execution
* [x] Show workflow status

Keep the dashboard simple and actionable.

---

## 8. Workflow Detail Page

* [x] Show workflow information
* [x] Show current health
* [x] Show execution history
* [x] Show monitoring checks
* [x] Show incidents
* [x] Show validation results
* [x] Show anomaly information

---

## 9. Alerts

* [x] Create alert service
* [x] Create alert when workflow becomes inactive
* [x] Create alert for output validation failure
* [x] Create alert for silent failure
* [x] Create alert for anomaly
* [x] Add alert status
* [x] Add alert resolution

For the MVP, a simple notification mechanism is sufficient.

---

## 10. Demo Mode

Create demo workflows that simulate:

* [x] Healthy workflow
* [x] Technical failure
* [x] Silent failure
* [x] Missing output
* [x] Inactive workflow
* [x] Abnormal output

The demo should allow the product to demonstrate its main value without external integrations.

---

## 11. AI Layer

Do this AFTER deterministic monitoring works.

* [x] Add AI incident summary  (currently template/rule-based text keyed off incident type, not a live model call — functionally complete for MVP, revisit if a real LLM explanation is wanted)
* [x] Add AI possible-cause explanation
* [x] Add AI suggested investigation steps
* [x] Ensure AI does not override monitoring rules

AI is optional for the first functional prototype.

---

## 12. Testing

* [x] Test workflow creation
* [x] Test execution recording
* [x] Test heartbeat detection
* [x] Test missing output detection
* [x] Test invalid output detection
* [x] Test anomaly detection
* [x] Test incident creation
* [x] Test incident resolution
* [ ] Test dashboard states  (no dedicated frontend/component test found)
* [x] Test demo scenarios

---

## 13. MVP Acceptance Test

The MVP should pass this scenario:

### Scenario

A workflow normally runs every hour.

It reports:

```text
SUCCESS
```

However, the workflow produces no expected output.

### Expected result

The monitoring system must:

1. Detect the missing output.
2. Mark the workflow as WARNING.
3. Create an incident.
4. Explain why the workflow is unhealthy.
5. Display the incident on the dashboard.
6. Generate an alert.

If this works reliably, the core product concept is working.

**Status: PASSING** — covered by `tests/acceptance.test.js` (18/18 tests passing overall).

---

## 14. Future — NOT MVP

Do not implement these yet:

* [ ] n8n integration
* [ ] Make integration
* [ ] Zapier integration
* [ ] Advanced AI agents
* [ ] Predictive failure models
* [ ] Multi-tenant enterprise architecture
* [ ] Advanced analytics
* [ ] Billing
* [ ] Mobile application
* [ ] Complex permissions
* [ ] Large-scale observability infrastructure
