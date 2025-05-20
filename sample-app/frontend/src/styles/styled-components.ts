import styled from 'styled-components'

export const SAppContainer = styled.div`
  text-align: center;
  padding: 20px;
`

export const STitle = styled.h1`
  color: #333;
  font-size: 2.5rem;
  margin-bottom: 20px;
`

export const SButton = styled.button`
  background-color: #ff6347;
  color: #fff;
  border: none;
  border-radius: 3px;
  margin: 10px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;

  &:hover {
    background-color: #e5533d;
  }

  &:disabled {
    background-color: #ddd;
    cursor: not-allowed;
  }
`

export const SInput = styled.input`
  padding: 10px;
  margin: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
  font-size: 1rem;

  &[type='number'] {
    width: 100px;
  }
`
