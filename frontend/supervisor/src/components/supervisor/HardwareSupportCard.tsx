import { ArrowRight } from 'lucide-react'
import supportHardware from '../../assets/supervisor-support-portrait.png'

export function HardwareSupportCard() {
  return (
    <section className="support-card" aria-label="Project support">
      <img className="support-image" src={supportHardware} alt="" aria-hidden="true" />
      <div className="support-copy">
        <h2>Support<br />better projects</h2>
        <p>Review, guide, and help students turn ideas into reality.</p>
        <button className="support-arrow" type="button" aria-label="Open project support">
          <ArrowRight size={24} />
        </button>
      </div>
    </section>
  )
}
