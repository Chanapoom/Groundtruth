# TECH_SPEC.md

# Automation Health Monitor — Technical Specification

## 1. Purpose

This document defines the technical direction for the Automation Health Monitor MVP.

`PRODUCT_SPEC.md` is the source of truth for product requirements.

This document defines how those requirements should be implemented.

---

## 2. MVP Technical Goal

Build a simple web application that can:

1. Register automation workflows.
2. Receive or record workflow execution events.
3. Monitor whether workflows are running as expected.
4. Validate expected outputs.
5. Detect silent failures.
6. Detect abnormal execution patterns.
7. Show workflow health in a simple dashboard.
8. Generate clear alerts when something is wrong.

The MVP should prioritize reliability and simplicity over scale.

---

## 3. Application Architecture

Use a simple web application architecture:

```text
Browser
   ↓
Frontend
   ↓
Backend API
   ↓
Database
   ↓
Monitoring Engine
   ↓
Alert System
```

Keep the architecture modular so additional integrations can be added later.

---

## 4. Frontend

Build a clean dashboard for monitoring automation health.

The dashboard should include:

* Overall system health
* Workflow list
* Workflow status
* Last execution
* Expected execution frequency
* Recent incidents
* Failure reason
* Basic workflow details

### UI principles

* Simple
* Easy to scan
* Minimal noise
* Clear status indicators
* Prioritize actionable information
* Avoid unnecessary charts

The user should understand the health of their automations within a few seconds.

---

## 5. Backend

The backend should provide APIs for:

### Workflow management

* Create workflow
* Update workflow
* Delete workflow
* Get workflow
* List workflows

### Execution tracking

* Record workflow execution
* Record execution status
* Record execution input/output metadata
* Record execution timestamp

### Monitoring

* Check workflow heartbeat
* Check expected output
* Validate output
* Detect anomalies
* Create incidents

### Alerts

* Create alert
* Resolve alert
* List active alerts

---

## 6. Database

Use a relational database.

The MVP should have at least these conceptual entities:

### Workflow

```text
id
name
platform
description
expected_frequency
status
created_at
updated_at
```

### Execution

```text
id
workflow_id
status
started_at
completed_at
input_summary
output_summary
created_at
```

### Check

```text
id
workflow_id
type
configuration
enabled
created_at
```

### Incident

```text
id
workflow_id
type
severity
message
detected_at
resolved_at
status
```

Do not over-engineer the schema during the MVP.

---

## 7. Monitoring Engine

The monitoring engine is the core of the product.

Monitoring should happen in layers.

### Layer 1 — Execution Check

Determine whether the workflow ran.

Example:

```text
Expected: run every 1 hour
Actual: no run for 3 hours
Result: WARNING
```

### Layer 2 — Output Check

Determine whether the expected output exists.

Example:

```text
Workflow: Lead Processing

Expected:
- CRM record created
- qualification status exists
- follow-up action created

Actual:
- workflow completed
- CRM record created
- qualification missing

Result: WARNING
```

### Layer 3 — Data Validation

Check whether important fields contain valid data.

Examples:

* Required field missing
* Empty output
* Invalid data type
* Unexpected value
* Unexpected response structure

### Layer 4 — Anomaly Detection

Compare current behavior against historical behavior.

Examples:

* Execution count suddenly drops
* Execution duration increases significantly
* Output volume suddenly drops
* Error rate increases
* Output structure changes

Use simple statistical/rule-based detection for the MVP.

Do not make AI responsible for basic monitoring logic.

---

## 8. AI Usage

AI should be an enhancement layer, not the foundation of monitoring.

Use deterministic checks first.

AI may be used for:

* Explaining incidents
* Summarizing what happened
* Suggesting possible causes
* Suggesting investigation steps
* Analyzing unusual output when deterministic rules are insufficient

Example:

```text
Incident:
Workflow completed successfully but produced 82% fewer records
than its normal daily average.

AI explanation:
"The workflow appears to be running normally, but the input
volume has dropped significantly. Check the upstream data source
or API response."
```

AI output must never automatically override deterministic monitoring results.

---

## 9. Silent Failure Detection

Silent failure is a first-class concept.

The system must distinguish:

```text
SUCCESS
WARNING
FAILED
INACTIVE
```

A workflow should not be considered healthy simply because its execution status is technically successful.

Example:

```text
Technical result:
SUCCESS

Business result:
FAILED

Final monitoring status:
WARNING
```

---

## 10. Heartbeat / Dead-Man's-Switch

Each monitored workflow may define an expected execution interval.

Example:

```text
Expected:
Every 60 minutes

Last execution:
3 hours ago

Result:
INACTIVE
```

The monitoring engine should generate an incident when the expected execution window is exceeded.

---

## 11. Output Validation

The system should support configurable validation rules.

Examples:

```text
required_field
not_empty
expected_type
minimum_count
maximum_count
contains_value
value_range
```

Example configuration:

```json
{
  "type": "required_field",
  "field": "customer_id"
}
```

Validation failures should create incidents.

---

## 12. Alerts

Alerts should be actionable rather than noisy.

Each alert should contain:

* Workflow
* Severity
* Problem
* Detection time
* Evidence
* Suggested next step

Example:

```text
Workflow: Daily Sales Report

Severity: HIGH

Problem:
Expected report was not generated.

Evidence:
Last successful output: 27 hours ago
Expected interval: 24 hours

Suggested action:
Check the workflow trigger and upstream data source.
```

---

## 13. Demo / Development Mode

The MVP should include simulated workflows.

This allows the product to demonstrate:

* Healthy workflow
* Failed workflow
* Silent failure
* Inactive workflow
* Abnormal output

The demo mode should work without connecting to real external automation platforms.

---

## 14. Integrations

Do not attempt to support every automation platform in the MVP.

Design the backend so integrations can be added later.

Potential future integrations:

* n8n
* Make
* Zapier
* Webhooks
* Custom APIs

For the MVP, a generic webhook/API ingestion mechanism is sufficient.

---

## 15. Security

Basic security should be implemented.

At minimum:

* Environment variables for secrets
* Never expose API keys in frontend code
* Validate incoming data
* Validate webhook payloads
* Basic authentication/authorization structure

Do not build enterprise-grade security during the MVP.

---

## 16. Error Handling

Errors must be handled explicitly.

The system should distinguish between:

```text
Technical failure
Silent failure
Validation failure
Missing expected output
Inactive workflow
Anomalous behavior
```

Errors should be logged with enough context to debug the issue.

---

## 17. Development Principles

Follow these principles:

1. Build the smallest useful MVP.
2. Prefer simple solutions.
3. Avoid unnecessary dependencies.
4. Keep monitoring logic modular.
5. Keep platform integrations separate from the core monitoring engine.
6. Make the system easy to extend later.
7. Do not build features that are not required by the MVP.
8. Do not add AI merely for the sake of using AI.

---

## 18. Definition of Technical Success

The MVP is technically successful when a user can:

1. Create a workflow.
2. Define how often it should run.
3. Define what output is expected.
4. Simulate or receive workflow executions.
5. Detect when a workflow stops running.
6. Detect when expected output is missing.
7. Detect invalid output.
8. Detect abnormal behavior.
9. See the problem clearly in the dashboard.
10. Receive an actionable alert.

The most important requirement is:

> The system must detect problems that ordinary workflow execution logs would consider successful.
