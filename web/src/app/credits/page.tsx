import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default function CreditsPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <Link href="/"><Wordmark size="sm" /></Link>
      <h1 className="text-2xl font-semibold">Credits and licenses</h1>
      <p>Ridemere’s original scenery, guests, staff, flat rides, interface artwork and synthesized sounds were created for Project Sunrise.</p>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Engine and open artwork</h2>
        <p>The simulation uses <a className="underline" href="https://github.com/OpenRCT2/OpenRCT2">OpenRCT2</a>, licensed under GPL-3.0. Open track and interface resources are credited to OpenRCT2 contributors. The hybrid, alpine and single-rail train artwork is by Edward Calver, under CC-BY-4.0.</p>
        <p>The smooth 3D presentation uses <a className="underline" href="https://threejs.org/">three.js</a>. Copyright © 2010–2026 three.js authors. <a className="underline" href="/licenses/three.txt">MIT license</a>. Its procedural park models were created for Ridemere.</p>
        <p>Sprite lettering uses Liberation Sans under the SIL Open Font License 1.1.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sound and music</h2>
        <p>Open effects and additional coaster sounds come from <a className="underline" href="https://github.com/OpenRCT2/OpenSoundEffects">OpenSoundEffects v1.0.6</a>, under CC-BY-4.0. Effects are credited to Karst van Galen Last, Ted John (crowd), Dan_AudioFile (cash), and tosha73 (dinghy slide); brake-fix source samples are CC0. Ridemere supplies 38 original synthesized replacements; its mixed sound object applies quieter playback levels.</p>
        <p>Three unmodified recordings from <a className="underline" href="https://github.com/OpenRCT2/OpenMusic">OpenMusic v1.6.1</a>, under CC-BY-SA-4.0:</p>
        <ul className="list-disc pl-5">
          <li>“Bumblebeat” — Karst van Galen Last / Jalmaan</li>
          <li>“Mystic Winds” — Skyshard</li>
          <li>“Rush” — Blackened Blue</li>
        </ul>
      </section>
      <p className="text-sm text-muted-foreground">License terms: <a className="underline" href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0</a>, <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</a>, <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/">CC-BY-SA-4.0</a>, and <a className="underline" href="https://openfontlicense.org/">SIL OFL</a>. Third-party rights remain with their respective creators.</p>
    </main>
  );
}
