import React from 'react';
import { css } from '@emotion/react';
type ErrorPopupProps = {
  message: string;
  isVisible: boolean;
};

const ErrorPopup: React.FC<ErrorPopupProps> = ({ message, isVisible }) => {
  if (!isVisible) return null;

  const errorPopup = css`
  width: 100%;
  position: fixed;
  z-index: 9999999;
  border: 1px solid #e9e9e9;
  border-radius: 30px;
  background-color: rgb(255, 224, 224);
  padding: 0.1;
  color: rgb(255, 0, 0);
  bottom: 0;
  left: 0;
  text-align: center;
  `;

  const errorContent = css`
  max-width: 100vw !important;
`;

  return (
    <div css={errorPopup}>
      <div css={errorContent}>
        <p>{message}</p>
      </div>
    </div>
  );
};


export default ErrorPopup;
