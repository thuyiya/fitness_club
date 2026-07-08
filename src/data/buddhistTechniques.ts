/**
 * A structured, respectfully-sourced library of Buddhist and mindfulness
 * mind-healing techniques. The on-device coach (see lib/mindGuidance.ts) reads
 * this to recognise a user's emotional state and weave an authentic, do-able
 * practice into its reply — offered gently, never preached.
 *
 * Content is framed to be secular-friendly and non-dogmatic: the traditional
 * (Pāli/Tibetan) roots are named for authenticity, but the steps and scripts
 * work for anyone regardless of belief.
 */

/**
 * Controlled vocabulary of emotional states a technique can help with. Kept in
 * sync with MoodState in lib/mindGuidance.ts (the canonical list lives there).
 */
export type MindState =
  | 'anxiety'
  | 'sadness'
  | 'grief'
  | 'anger'
  | 'stress'
  | 'fear'
  | 'loneliness'
  | 'craving'
  | 'restlessness'
  | 'insomnia'
  | 'low-energy'
  | 'overwhelm'
  | 'self-criticism'
  | 'numbness'
  | 'joy'
  | 'gratitude';

export type MindTradition =
  | 'Theravada'
  | 'Mahayana'
  | 'Zen'
  | 'Secular mindfulness';

export type MindDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface MindTechnique {
  /** Stable kebab-case identifier. */
  id: string;
  /** Human-facing name (English, with the traditional term where apt). */
  name: string;
  /** Lineage the practice is rooted in. */
  tradition: MindTradition;
  /** One or two sentences on what it is and why it helps. */
  summary: string;
  /** Emotional states this practice tends to ease or support. */
  forStates: MindState[];
  /** Suggested length in minutes. */
  durationMin: number;
  difficulty: MindDifficulty;
  /** Concrete, do-able instructions, in order. */
  steps: string[];
  /** A warm 2-4 sentence script the coach can read aloud or paraphrase. */
  guidance: string;
  /** Optional one-line dharma insight behind the practice. */
  teaching?: string;
}

export const BUDDHIST_TECHNIQUES: MindTechnique[] = [
  {
    id: 'metta',
    name: 'Loving-Kindness (Mettā)',
    tradition: 'Theravada',
    summary:
      'Silently offering warm wishes — first to yourself, then outward — to soften a hard or lonely heart.',
    forStates: ['loneliness', 'sadness', 'self-criticism', 'anger', 'numbness'],
    durationMin: 8,
    difficulty: 'beginner',
    steps: [
      'Sit comfortably and take three slow breaths, letting the body settle.',
      'Bring a hand to your heart and picture yourself as you are right now.',
      'Silently repeat: “May I be safe. May I be healthy. May I be at ease. May I be happy.”',
      'Let the phrases land gently, without forcing any feeling.',
      'Now picture someone you love and offer them the same four wishes.',
      'Widen the circle to a neutral person, then to all beings everywhere.',
    ],
    guidance:
      'Let’s send a little warmth inward first — you deserve the same kindness you give others. Just repeat quietly, “May I be at ease, may I be happy,” and let it be enough. If the words feel flat, that’s okay; the intention is what matters.',
    teaching: 'Kindness toward yourself is not selfish — it is the ground all other kindness grows from.',
  },
  {
    id: 'anapanasati',
    name: 'Mindfulness of Breathing (Ānāpānasati)',
    tradition: 'Theravada',
    summary:
      'Resting attention on the natural breath to steady a scattered or racing mind.',
    forStates: ['anxiety', 'stress', 'restlessness', 'overwhelm', 'fear'],
    durationMin: 6,
    difficulty: 'beginner',
    steps: [
      'Sit upright but relaxed, and let the eyes close or soften downward.',
      'Notice where the breath is clearest — the nostrils, chest, or belly.',
      'Don’t change the breath; simply feel it come in and go out.',
      'Silently note “in” on the in-breath and “out” on the out-breath.',
      'When the mind wanders, gently notice, then return to the next breath.',
      'Rest here, one breath at a time, for a few minutes.',
    ],
    guidance:
      'Nothing to fix right now — just come back to one breath. Feel the air arrive… and feel it leave. When your thoughts wander off (they will), that noticing is the practice; kindly begin again with the very next breath.',
    teaching: 'You are always only one breath away from the present moment.',
  },
  {
    id: 'vipassana-noting',
    name: 'Insight Noting (Vipassana)',
    tradition: 'Theravada',
    summary:
      'Quietly labelling whatever arises — “thinking,” “aching,” “worrying” — to see experience clearly and stop being swept away by it.',
    forStates: ['anxiety', 'restlessness', 'overwhelm', 'craving', 'self-criticism'],
    durationMin: 10,
    difficulty: 'intermediate',
    steps: [
      'Settle into a steady posture and take a few grounding breaths.',
      'Let attention rest openly, without seeking anything in particular.',
      'As each experience arises, give it a soft mental label: “planning,” “tightness,” “sound,” “longing.”',
      'Keep the note light and neutral — one word is enough.',
      'Watch how each noted experience shifts or dissolves on its own.',
      'Return to open awareness between notes.',
    ],
    guidance:
      'When the mind gets loud, try just naming what’s here — “worrying,” “aching,” “planning” — in a soft, neutral voice inside. You’re not fighting any of it; you’re simply seeing it clearly. Notice how each thing you name tends to loosen its grip and pass.',
    teaching: 'What you can name, you no longer have to be.',
  },
  {
    id: 'body-scan',
    name: 'Body Scan',
    tradition: 'Secular mindfulness',
    summary:
      'Slowly moving attention through the body to release held tension and reconnect with physical sensation.',
    forStates: ['stress', 'insomnia', 'anxiety', 'numbness', 'overwhelm'],
    durationMin: 12,
    difficulty: 'beginner',
    steps: [
      'Lie down or sit, and take one long, slow breath out.',
      'Bring attention to the top of your head and notice any sensation there.',
      'Move slowly downward — face, neck, shoulders, arms, chest, belly.',
      'Wherever you find tightness, breathe into it and let it soften on the out-breath.',
      'Continue down through the hips, legs, and feet.',
      'Finish by sensing the whole body resting, held, and at ease.',
    ],
    guidance:
      'Let’s take a slow tour through the body and let it put itself down. Start at the crown of your head and drift down — soften the jaw, drop the shoulders, let the belly be soft. Wherever you meet tension, breathe into it and let the out-breath carry a little of it away.',
    teaching: 'The body often holds what the mind won’t admit; attention is how we set it down.',
  },
  {
    id: 'rain',
    name: 'RAIN for Difficult Emotions',
    tradition: 'Secular mindfulness',
    summary:
      'A four-step way to meet a strong feeling — Recognize, Allow, Investigate, Nurture — so it can move through instead of taking over.',
    forStates: ['sadness', 'anger', 'fear', 'grief', 'self-criticism', 'overwhelm'],
    durationMin: 8,
    difficulty: 'intermediate',
    steps: [
      'Recognize: name what you’re feeling — “this is anxiety,” “this is grief.”',
      'Allow: let it be here without fixing or pushing it away; say “it’s okay that this is here.”',
      'Investigate: gently ask where you feel it in the body and what it needs.',
      'Nurture: offer yourself a kind gesture or words — “may I be gentle with myself.”',
      'Rest afterward in the more spacious awareness that remains.',
    ],
    guidance:
      'When a feeling is big, try meeting it with RAIN. First just name it — “this is fear.” Let it be here without a fight, get curious about where it lives in your body, then offer yourself the same comfort you’d give a friend. You don’t have to make it leave; you just have to stop battling it.',
    teaching: 'A feeling fully allowed is a feeling free to pass.',
  },
  {
    id: 'satipatthana-four-foundations',
    name: 'Four Foundations of Mindfulness (Satipaṭṭhāna)',
    tradition: 'Theravada',
    summary:
      'Grounding awareness in body, feeling-tone, mind-states, and mental objects — a complete map for steady, clear attention.',
    forStates: ['restlessness', 'overwhelm', 'numbness', 'stress'],
    durationMin: 15,
    difficulty: 'advanced',
    steps: [
      'Body: settle attention on the breath and posture, feeling the body as body.',
      'Feeling-tone: notice whether each experience is pleasant, unpleasant, or neutral — without reacting.',
      'Mind: observe the quality of mind present — is it calm, agitated, contracted, or open?',
      'Mental objects: watch thoughts and moods arise and pass like weather.',
      'Move gently between the four, returning to the breath whenever you feel lost.',
    ],
    guidance:
      'This is a slower, fuller practice — a way of watching your whole experience. Rest first in the body, then simply notice whether things feel pleasant, unpleasant, or neutral, then the mood of the mind itself. It all rises and falls like weather; your job is only to watch the sky.',
    teaching: 'Clear seeing, not control, is what frees the mind.',
  },
  {
    id: 'working-with-anger',
    name: 'Cooling Anger',
    tradition: 'Theravada',
    summary:
      'Meeting anger with awareness and patience so its heat can be felt fully and released, rather than acted out.',
    forStates: ['anger', 'stress', 'overwhelm'],
    durationMin: 7,
    difficulty: 'intermediate',
    steps: [
      'Pause before speaking or acting; take one deliberate slow breath.',
      'Feel the anger physically — the heat, the tightness, the pressure — without a story.',
      'Silently acknowledge: “anger is here, and it will pass.”',
      'Lengthen the out-breath, letting each exhale be longer than the inhale.',
      'Ask what the anger is protecting — often hurt or fear underneath.',
      'Offer yourself a phrase of patience: “may I meet this with a steady heart.”',
    ],
    guidance:
      'Anger is energy, not an emergency — let’s give it a moment before it runs the show. Feel the heat of it in your body and breathe out slowly, a little longer each time. Underneath the fire there’s usually something tender; you can be firm about what matters without being burned by it.',
    teaching: 'Holding onto anger is like grasping a hot coal to throw at another — you are the one burned.',
  },
  {
    id: 'grief-tending',
    name: 'Tending Grief',
    tradition: 'Secular mindfulness',
    summary:
      'Making gentle room for loss — letting waves of sorrow come and go without rushing to feel better.',
    forStates: ['grief', 'sadness', 'loneliness', 'numbness'],
    durationMin: 10,
    difficulty: 'intermediate',
    steps: [
      'Find a private, comfortable place and put a hand on your heart.',
      'Let yourself feel whatever is present — tears, heaviness, or numbness are all welcome.',
      'Name the loss quietly and honor what it meant to you.',
      'Breathe with the wave of feeling; let it rise, crest, and ease on its own.',
      'Whisper something kind: “it’s okay to grieve; this is love with nowhere to go.”',
      'Rest afterward, and be gentle with yourself for the rest of the day.',
    ],
    guidance:
      'Grief isn’t a problem to solve — it’s love that misses its home. You don’t have to be strong right now; just let the wave come and hold yourself through it. There’s no timeline here, and no feeling you’re having is wrong.',
    teaching: 'Grief is the price of having loved — meet it with tenderness, not haste.',
  },
  {
    id: 'working-with-fear',
    name: 'Steadying Fear',
    tradition: 'Theravada',
    summary:
      'Anchoring in the body and breath to keep fear from spiralling, and meeting it with a note of courage.',
    forStates: ['fear', 'anxiety', 'overwhelm', 'restlessness'],
    durationMin: 6,
    difficulty: 'beginner',
    steps: [
      'Plant both feet on the floor and feel the ground firmly holding you.',
      'Take a slow breath and lengthen the exhale to signal safety to the body.',
      'Name it plainly: “this is fear; I am safe enough in this moment.”',
      'Notice five things you can see and three you can hear, right now.',
      'Place a hand on the belly and feel it rise and fall a few times.',
      'Remind yourself that this feeling is a wave, not a fact about the future.',
    ],
    guidance:
      'Fear pulls us into the future — let’s come back to right here, where you’re actually okay. Feel your feet on the ground, lengthen your out-breath, and name a few things you can see and hear. The feeling is real, but it isn’t a prediction; you can ride it out one breath at a time.',
    teaching: 'Fear grows in the future; safety is found in the present.',
  },
  {
    id: 'working-with-craving',
    name: 'Surfing Craving (Urge Surfing)',
    tradition: 'Secular mindfulness',
    summary:
      'Watching an urge rise, peak, and fall like a wave — riding it out without acting on it.',
    forStates: ['craving', 'restlessness', 'stress', 'low-energy'],
    durationMin: 5,
    difficulty: 'beginner',
    steps: [
      'When an urge hits, pause and notice it instead of acting immediately.',
      'Locate it in the body — where is the pull, the tension, the itch?',
      'Breathe with it and picture the urge as a wave building toward a crest.',
      'Stay curious: watch it rise… peak… and begin to fall.',
      'Notice that no wave lasts forever; each one passes if you let it.',
      'Afterward, do one small kind thing for yourself instead.',
    ],
    guidance:
      'An urge feels like it’ll last forever, but it’s really a wave — it crests and then it falls. Instead of fighting it, get curious: where do you feel the pull in your body? Breathe and ride it out; you don’t have to do anything but watch it pass.',
    teaching: 'You don’t have to obey every wave — you only have to ride it until it breaks.',
  },
  {
    id: 'tonglen',
    name: 'Giving & Receiving (Tonglen)',
    tradition: 'Mahayana',
    summary:
      'Breathing in suffering and breathing out relief — a compassion practice that transforms pain into care.',
    forStates: ['sadness', 'grief', 'loneliness', 'self-criticism', 'numbness'],
    durationMin: 9,
    difficulty: 'advanced',
    steps: [
      'Sit quietly and settle with a few natural breaths.',
      'On the in-breath, imagine breathing in a dark cloud of pain — your own or another’s.',
      'On the out-breath, imagine sending out cool, bright relief and ease.',
      'Start with your own suffering, then include someone who suffers as you do.',
      'Widen it to all who feel this same pain anywhere in the world.',
      'Rest, letting the heart stay soft and open.',
    ],
    guidance:
      'This one flips our instinct: instead of pushing pain away, we breathe it in — for ourselves and everyone who hurts like we do — and breathe out relief. It sounds heavy, but it makes the heart bigger, not smaller. Start with your own pain, and let your care flow outward with each breath.',
    teaching: 'Turning toward suffering with compassion is how it stops ruling us.',
  },
  {
    id: 'four-immeasurables',
    name: 'The Four Immeasurables (Brahmavihārā)',
    tradition: 'Mahayana',
    summary:
      'Cultivating loving-kindness, compassion, sympathetic joy, and equanimity — the four boundless heart-qualities.',
    forStates: ['loneliness', 'self-criticism', 'anger', 'sadness', 'gratitude'],
    durationMin: 12,
    difficulty: 'intermediate',
    steps: [
      'Loving-kindness: wish “may you be happy” to yourself and a loved one.',
      'Compassion: for someone struggling, wish “may you be free from suffering.”',
      'Sympathetic joy: recall someone’s good fortune and wish “may your happiness grow.”',
      'Equanimity: rest in “may I meet all of this with a balanced heart.”',
      'Move slowly through each, pausing to let the quality settle.',
    ],
    guidance:
      'These are four flavours of an open heart — warmth, care for pain, delight in others’ joy, and a steady balance through it all. You can dwell on just one today. Try wishing someone well, then quietly wish it for yourself too.',
    teaching: 'The heart has room for everyone — including you.',
  },
  {
    id: 'sympathetic-joy',
    name: 'Sympathetic Joy (Muditā)',
    tradition: 'Theravada',
    summary:
      'Delighting in others’ happiness to counter envy, comparison, and the greyness of low mood.',
    forStates: ['sadness', 'self-criticism', 'numbness', 'joy', 'gratitude'],
    durationMin: 6,
    difficulty: 'beginner',
    steps: [
      'Bring to mind someone who is thriving or celebrating right now.',
      'Picture their happiness clearly and let yourself smile with them.',
      'Silently offer: “may your joy continue and grow.”',
      'Notice any envy or comparison, and gently soften it.',
      'Include yourself: recall a recent small good thing and savour it.',
    ],
    guidance:
      'When everything feels grey, borrowing someone else’s joy can be a doorway back. Picture someone you care about doing well, and let yourself be glad with them — no comparison, just shared gladness. Then find one small good thing of your own and let it be enough.',
    teaching: 'Another’s joy, celebrated, becomes your own.',
  },
  {
    id: 'equanimity',
    name: 'Equanimity (Upekkhā)',
    tradition: 'Theravada',
    summary:
      'Resting in a balanced, unshaken awareness that lets things be as they are, ups and downs alike.',
    forStates: ['stress', 'overwhelm', 'anger', 'fear', 'restlessness'],
    durationMin: 8,
    difficulty: 'intermediate',
    steps: [
      'Sit steady and take a few slow, level breaths.',
      'Bring to mind a situation that pulls you around emotionally.',
      'Silently reflect: “things are as they are; I can meet this with balance.”',
      'Feel your breath as a stable center beneath the changing weather of feeling.',
      'Let both pleasant and unpleasant be present without leaning toward or away.',
      'Rest in the steady, spacious awareness that holds it all.',
    ],
    guidance:
      'Equanimity isn’t not caring — it’s caring without being knocked over. Let’s find that steady center beneath the ups and downs. Breathe, and let the reflection settle: “things are as they are, and I can meet this with a balanced heart.”',
    teaching: 'Peace is not the absence of storms, but a steadiness in their midst.',
  },
  {
    id: 'anicca-impermanence',
    name: 'Contemplating Impermanence (Anicca)',
    tradition: 'Theravada',
    summary:
      'Reflecting on the ever-changing nature of experience to loosen the grip of a hard moment.',
    forStates: ['sadness', 'craving', 'grief', 'stress', 'overwhelm'],
    durationMin: 7,
    difficulty: 'intermediate',
    steps: [
      'Settle with a few breaths and notice one sensation clearly.',
      'Watch it closely — see how it subtly shifts, moment to moment.',
      'Recall that thoughts, moods, and even this hard day are always changing.',
      'Silently reflect: “this too is changing; nothing stays the same.”',
      'Let this soften any sense that the present difficulty is permanent.',
      'Rest in the openness that comes from holding things lightly.',
    ],
    guidance:
      'Whatever is heavy right now, notice one true thing: it’s already changing. Watch any sensation closely and you’ll see it never holds still. This hard moment is weather, not climate — “this too is changing” can be a quiet comfort to lean on.',
    teaching: 'Everything that arises passes away — including this.',
  },
  {
    id: 'mindful-walking',
    name: 'Mindful Walking (Caṅkama)',
    tradition: 'Zen',
    summary:
      'Turning slow, deliberate walking into meditation — good when sitting still feels impossible.',
    forStates: ['restlessness', 'anxiety', 'low-energy', 'insomnia', 'overwhelm'],
    durationMin: 10,
    difficulty: 'beginner',
    steps: [
      'Choose a short path — even a few paces indoors will do.',
      'Stand still first and feel your feet in contact with the ground.',
      'Begin walking slowly, feeling each lift, move, and placing of the foot.',
      'Let attention rest in the soles of the feet, not the destination.',
      'At the end of the path, pause, turn mindfully, and walk back.',
      'If the mind wanders, come back to the next step.',
    ],
    guidance:
      'If sitting still feels like too much, let’s walk instead. Slow right down and feel each step — the lift, the swing, the soft landing of your foot. There’s nowhere to get to; the whole practice is just this next step.',
    teaching: 'You don’t have to arrive anywhere — the path itself is the practice.',
  },
  {
    id: 'mountain-meditation',
    name: 'Mountain Meditation',
    tradition: 'Secular mindfulness',
    summary:
      'Imagining yourself as a mountain — grounded and unmoved while the weather of emotion passes over.',
    forStates: ['stress', 'overwhelm', 'fear', 'anger', 'self-criticism'],
    durationMin: 9,
    difficulty: 'beginner',
    steps: [
      'Sit with a tall, dignified posture and take a few settling breaths.',
      'Picture a great mountain — its broad base, solid sides, still peak.',
      'Imagine you are that mountain: rooted, patient, unshaken.',
      'See seasons and storms pass over it while it remains steady.',
      'Let your emotions be the passing weather; you are the mountain beneath.',
      'Rest in that grounded stillness for a few breaths before finishing.',
    ],
    guidance:
      'Sit tall and imagine you’re a mountain — vast, rooted, and calm. Storms roll across it, seasons change, but the mountain simply remains. Your feelings are the weather today; let them pass over you while you stay steady and whole beneath them.',
    teaching: 'Storms come and go; the mountain abides.',
  },
  {
    id: 'lake-meditation',
    name: 'Lake Meditation',
    tradition: 'Secular mindfulness',
    summary:
      'Resting like a still lake that reflects everything yet is disturbed by nothing — soothing for a busy or sleepless mind.',
    forStates: ['insomnia', 'restlessness', 'anxiety', 'stress', 'numbness'],
    durationMin: 10,
    difficulty: 'beginner',
    steps: [
      'Lie down or recline and let the breath grow slow and easy.',
      'Picture a calm lake with a smooth, still surface.',
      'Imagine your mind as that water — able to hold sky, cloud, and light.',
      'When thoughts ripple the surface, watch them settle back to stillness.',
      'Let the depths of the lake stay quiet and undisturbed beneath any ripple.',
      'Rest here, still and reflective, letting the body grow heavy.',
    ],
    guidance:
      'Let’s become a still lake. On the surface, thoughts and feelings ripple through — that’s fine, that’s just wind on the water. But deep down the lake stays calm and quiet. Let your body grow heavy and rest in those still depths.',
    teaching: 'The surface may ripple, but the depths remain calm.',
  },
];
