# Dristinet

Dristinet is a network intelligence and analytics platform that continuously monitors internet connection performance through periodic speed tests, collects and organizes connectivity telemetry, and provides statistical analysis and visual insights into connection quality, stability, latency behavior, throughput consistency, outages, and long-term performance trends through an interactive dashboard.

This project is developed and tested on Linux. The current release is distributed as an AppImage for Linux, and the same architecture can be ported to Windows and macOS in future builds.

## Why Dristinet?

- To gain deeper visibility into network behavior and long-term connectivity trends.
- To identify unstable or deteriorating internet performance that may not be evident through occasional testing.
- To generate structured performance reports and evidence-backed analytics for Internet Service Providers (ISPs) or network technicians.
- To document intermittent issues that temporarily vanish during troubleshooting sessions but continue recurring in practical usage scenarios.
- To support data-driven diagnosis of network instability instead of relying solely on subjective user complaints.

## How It Works

Dristinet is designed around two layers:

- A background collection layer that runs periodic speed tests and stores results as telemetry.
- A dashboard layer that reads historical data, calculates comparisons, and presents charts, summaries, and trends.

On Linux, the background collection layer is managed through `systemd`. A user-level service periodically triggers the collector, stores measurements in SQLite, and keeps the data available for the dashboard and historical analysis. This makes the monitoring loop persistent, lightweight, and independent from the frontend.

## Release

For Linux, download the latest release `.AppImage` file and run it directly.

The release package includes the Electron application and the local dashboard experience needed to view live and historical speedtest analytics.

## What Dristinet Provides

- Periodic speedtest collection in the background.
- Historical analysis of download, upload, latency, and jitter patterns.
- Visual dashboards for comparing recent results with long-term behavior.
- Structured telemetry for troubleshooting, reporting, and trend analysis.
- A practical view of real-world connection quality over time.

## Design Notes

- Developed and validated on Linux first.
- Background collection is service-driven rather than browser-session-driven.
- The architecture is suitable for later Windows and macOS ports.
- The release format is optimized for straightforward local execution on Linux.

## Architecture Overview

```
┌─────────────────────┐    ┌────────────────────────┐
│  systemd service     │    │    Electron dashboard │
│  periodic collector  │    │    analytics UI       │
│                     │    │                        │
│  • scheduled tests   │    │  • charts and trends   │
│  • telemetry capture │    │  • summaries           │
│  • SQLite writes     │    │  • comparisons         │
└──────────┬───────────┘    └──────────┬─────────────┘
           │                            │
           └──────────────┬─────────────┘
                          │
               ┌──────────▼──────────┐
               │      SQLite DB      │
               │  speedtest history  │
               └─────────────────────┘
```
