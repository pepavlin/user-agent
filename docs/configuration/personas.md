# Persona Presets

UserAgent includes 8 built-in persona presets representing common user archetypes. Use them with `--persona-preset <key>`.

## Built-in Presets

| Key | Name | Description |
|-----|------|-------------|
| `elderly` | Elderly User | Marie, 68, retired. Very limited tech skills, needs clear instructions |
| `gen-z` | Gen-Z Mobile User | Eliska, 19, student. Mobile-first, impatient, expects modern UX |
| `designer` | UX Designer | Jan, 32, UX designer. Critical of design patterns and UX quality |
| `developer` | Developer | Tomas, 28, software developer. Focused on performance and technical details |
| `accessibility` | Accessibility User | Pavel, 45, partially blind. Uses screen reader, relies on accessible elements |
| `business` | Business User | Petra, 42, manager. Time-pressed, focused on efficiency |
| `first-time` | First-time Visitor | Lucie, 35, first visit. Needs clear orientation and guidance |
| `power-user` | Power User | Martin, 30, experienced. Expects advanced features and keyboard shortcuts |

Each preset includes 3 sample intents for inspiration. Run `user-agent personas` to see full descriptions and sample intents.

## Usage

```bash
# Use a preset
user-agent --url "https://example.com" --persona-preset elderly --intent "Find help page"

# List all presets
user-agent personas
```

## Custom Personas

Write a natural language description — the more detail, the better the simulation:

```bash
user-agent --url "https://example.com" \
  --persona "Jana, 45 years old. Never used Spotify but knows YouTube. Not tech-savvy and found this page by accident."
```

Tips for effective personas:
- Include **age** and **tech experience level**
- Mention **familiar apps/services** for reference points
- Describe **how they found** the page (intent, accident, recommendation)
- Add **personality traits** that affect behavior (impatient, cautious, curious)
- Write in the **language** you want the AI to think and respond in

The AI responds in the language of the persona description — write the persona in Czech for Czech-language observations, or in English for English-language output.
