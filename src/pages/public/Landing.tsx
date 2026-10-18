
import LandingNavbar from './LandingNavbar'
import LandingHero from './LandingHero'
import LandingSections from './LandingSections'

/** Figma 01 · Landing. Responsable: Diego. */
export default function Landing() {
  return (
    <div className="min-h-full bg-base text-fg">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingSections />
      </main>
    </div>
  )
}

