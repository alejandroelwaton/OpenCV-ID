import LiveRecognizer from "./components/LiveRecognizer";
import Recognizer from "./components/Recognizer";
import Upload from "./components/Upload";
import TrainerButton from "./components/Trainer";

export default function App() {
  return (
  <>
  <Upload></Upload>
  <TrainerButton></TrainerButton>
  <Recognizer></Recognizer>
  <LiveRecognizer></LiveRecognizer>
  </>
  );
}