/**
 * Door event detection from player input and model output.
 */

// Player explicitly states intent to go through a door
const PLAYER_DOOR_PATTERNS = [
    /\b(?:walk|step|go|pass|move|run|rush|stumble|head)\s+(?:through|into|toward|towards)\s+(?:the\s+)?(?:marble\s+)?(?:white\s+)?door/i,
    /\b(?:open|push|pull)\s+(?:the\s+)?(?:marble\s+)?(?:white\s+)?door/i,
    /\benter\s+(?:the\s+)?(?:marble\s+)?(?:white\s+)?door/i,
    /\bthrough\s+(?:the\s+)?(?:marble\s+)?(?:white\s+)?door/i,
    /\bcross(?:es|ed)?\s+(?:the\s+)?threshold/i,
    /\bstep\s+(?:through|into)\s+(?:the\s+)?(?:door)?(?:way|frame)/i,
];

// Model narrates NPC-initiated door traversal
const MODEL_DOOR_PATTERNS = [
    /(?:push|pull|drag|lead|guide|shove|carry|usher)s?\s+(?:you|{{user}})\s+(?:through|into|toward)\s+(?:the\s+)?(?:marble\s+)?door/i,
    /(?:you|{{user}})\s+(?:step|stumble|fall|tumble|pass|walk)s?\s+(?:through|into)\s+(?:the\s+)?(?:marble\s+)?door/i,
    /through\s+(?:the\s+)?(?:marble|white)\s+door(?:way)?/i,
    /(?:the\s+)?door\s+(?:swallows|pulls|draws|takes)\s+(?:you|{{user}})/i,
    /(?:you|{{user}})\s+(?:are\s+)?(?:pulled|dragged|led|guided|pushed)\s+through/i,
];

// Crescent moon = always leads to The Manifold
const MANIFOLD_RETURN_PATTERNS = [
    /crescent\s+moon/i,
    /moon\s+(?:etching|symbol|mark|carving)/i,
    /door\s+(?:back\s+)?to\s+(?:the\s+)?manifold/i,
    /return(?:s|ing)?\s+to\s+(?:the\s+)?manifold/i,
    /back\s+to\s+(?:the\s+)?manifold/i,
];

// Negation — player explicitly refuses the door
const NEGATION_PATTERNS = [
    /\b(?:don'?t|refuse|avoid|ignore|won'?t|can'?t|shouldn'?t)\b.*\b(?:door|threshold)/i,
    /\b(?:walk|turn|back|step|move)\s+away\b.*\b(?:door|threshold)/i,
    /\bleave\s+(?:the\s+)?door/i,
    /\bclose\s+(?:the\s+)?door/i,
];

/**
 * Detect a door event in a message.
 *
 * @param {string} messageText - The message to scan.
 * @param {'player'|'model'} source - Whether this is player input or model output.
 * @returns {{ detected: boolean, type: string|null, isManifoldReturn: boolean }}
 */
function detectDoorEvent(messageText, source) {
    if (!messageText) return { detected: false, type: null, isManifoldReturn: false };

    // Check negation first — if the player is refusing the door, no detection
    if (source === 'player' && NEGATION_PATTERNS.some(rx => rx.test(messageText))) {
        return { detected: false, type: null, isManifoldReturn: false };
    }

    // Check for Manifold return (crescent moon)
    const isManifoldReturn = MANIFOLD_RETURN_PATTERNS.some(rx => rx.test(messageText));
    if (isManifoldReturn) {
        return { detected: true, type: source, isManifoldReturn: true };
    }

    // Check for door traversal
    const patterns = source === 'player' ? PLAYER_DOOR_PATTERNS : MODEL_DOOR_PATTERNS;
    const detected = patterns.some(rx => rx.test(messageText));
    return { detected, type: detected ? source : null, isManifoldReturn: false };
}

export { detectDoorEvent };
