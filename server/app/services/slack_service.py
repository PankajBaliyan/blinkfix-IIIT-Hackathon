import httpx
import logging
from typing import Dict, Any
from ..config import settings

logger = logging.getLogger("blinkfix.slack")

async def send_slack_incident_alert(
    incident_id: str,
    service: str,
    error_name: str,
    error_message: str,
    pr_url: str,
    duration_ms: int,
    culprit_commit: str = "abc104",
) -> bool:
    """Dispatches an interactive Block Kit notification to Slack."""
    mttr_seconds = f"{duration_ms / 1000:.2f}s"
    
    payload = {
        "text": f"🚨 P0 Incident Resolved in {mttr_seconds} | Blinkfix Swarm Zero",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🚨 P0 Incident Auto-Remediated by Blinkfix",
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Service:*\n`{service}`"},
                    {"type": "mrkdwn", "text": f"*MTTR Resolution:*\n`{mttr_seconds}`"},
                    {"type": "mrkdwn", "text": f"*Root Cause:*\n`{culprit_commit}` (PR #104)"},
                    {"type": "mrkdwn", "text": f"*Error:*\n`{error_name}`"},
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Description:*\n{error_message}\n*Draft PR:* <{pr_url}|Review Draft PR on GitHub>",
                },
            },
        ],
    }

    if settings.SLACK_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(settings.SLACK_WEBHOOK_URL, json=payload)
                return resp.status_code == 200
        except Exception as e:
            logger.warning(f"Failed to post to Slack: {e}")
            return False
            
    logger.info(f"Slack alert simulated for incident {incident_id}: PR {pr_url}")
    return True

