import styles from './Footer.module.scss'

function Footer() {
    return (
      <footer className={styles.footer}>
        <div className={styles.links}>
          <a href="/">Home</a>
          <a href="https://mystenlabs.com/">Mysten Labs</a>
          <a href="https://devportal-30dd0.web.app/">Developer Hub</a>
        </div>
      </footer>
    );
}

export default Footer;
