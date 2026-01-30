import * as React from "react";

function Preloader() {
  const loading = (
    <div className="preloader">
      <div className="preloader-row preloader-enter">
        <div className="preloader-circle"></div>
        <div className="preloader-circle"></div>
        <div className="preloader-circle"></div>
      </div>
    </div>
  );

  return <React.Fragment>{loading}</React.Fragment>;
}

export default Preloader;
