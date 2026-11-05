import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1>Hello World</h1>
        <h3>This is Team M</h3>
        <h3>Team Members : Chalith, Faisal, Jagrith</h3>
        <hr>(c)Rio Cinema</hr>
      </div>
    </>
  )
}

export default App
