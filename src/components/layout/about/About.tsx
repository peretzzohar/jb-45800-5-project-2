import "./About.css";

export default function About() {
  return (
    <div className="about-container">

      <h1>About The Weather App</h1>


      <section className="about-section">
        <h2>🌤️ About the App</h2>
        <p>
          This weather application allows users to search for cities and get
          real-time weather data including temperature, humidity, wind speed,
          and weather conditions.
        </p>

        <p>
          The app also saves your search history so you can easily revisit
          previously searched locations.
        </p>
      </section>

      <section className="developer-section">
        <h2>👨‍💻 Developer</h2>
        <p><b>Name:</b> Zohar Peretz</p>
        <p><b>Project:</b> Weather App (React + TypeScript)</p>
        <p><b>Features:</b> API integration, history storage, responsive UI</p>
      </section>

    </div>
  );
}