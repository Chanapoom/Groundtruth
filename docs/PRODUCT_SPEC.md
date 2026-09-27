# Automation Health Monitor

## 1. Product Overview

Build a web application that monitors business-critical automation
workflows and detects silent failures.

The core principle is:

> Don't just monitor whether an automation ran.
> Monitor whether it produced the expected outcome.

## 2. Problem

Traditional automation monitoring focuses on technical errors.

This misses silent failures such as:

- Workflow runs successfully but produces empty data
- API returns HTTP 200 with unexpected data
- Required records are not created
- Expected emails/messages are not sent
- Workflow stops running without generating an error
- Output volume suddenly drops
- AI generates invalid or suspicious output

These failures can cause lost revenue, bad customer experiences,
data corruption, and manual debugging work.

## 3. Target Users

Primary users:

- Small businesses using automation
- Automation freelancers/agencies
- n8n users
- Make users
- Zapier users
- Teams running AI workflows

## 4. Core MVP

The MVP should focus on three capabilities:

### A. Workflow Monitoring

Track:

- Workflow name
- Platform
- Last successful run
- Expected run frequency
- Current status

### B. Silent Failure Detection

Detect:

- Missing expected output
- Unexpected output
- Sudden volume changes
- Empty responses
- Workflow inactivity
- Basic data integrity violations

### C. Alerts

Notify users when:

- A workflow stops running
- Expected output is missing
- Output looks abnormal
- Data validation fails

## 5. Dashboard

The dashboard should show:

- Overall automation health
- Healthy workflows
- Warning workflows
- Failed workflows
- Recent incidents
- Last activity
- Failure reason

Keep the dashboard simple.

Avoid excessive charts and noisy monitoring.

## 6. AI Detection

AI should NOT be the first layer of monitoring.

Use deterministic rules first.

Example:

1. Check whether workflow ran.
2. Check whether expected output exists.
3. Check basic data validation.
4. Compare against historical behavior.
5. Use AI only when deeper reasoning is useful.

AI can explain:

- What probably happened
- Why the behavior looks abnormal
- Which workflow step may be responsible
- What the user should investigate

## 7. Example

Workflow:

Lead → AI qualification → CRM → Email

Expected outcome:

- Lead exists in CRM
- Lead has qualification status
- Follow-up email is created

The workflow may report SUCCESS while the email step
actually produced nothing.

The monitoring system should detect:

STATUS: Warning

Reason:
"Workflow completed successfully, but the expected follow-up
email was not created."

## 8. MVP Constraints

Do NOT build a huge observability platform.

Prioritize:

- Simple UI
- Easy setup
- Clear alerts
- Silent failure detection
- Business outcome monitoring

Avoid:

- Complex enterprise features
- Huge analytics dashboards
- Excessive integrations
- Over-engineered AI agents

## 9. Product Principle

The product should answer one question:

> "Did my automation actually do what it was supposed to do?"

Not:

> "Did my automation technically finish?"
