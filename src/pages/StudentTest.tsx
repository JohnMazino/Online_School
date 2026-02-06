import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { testsApi } from '../api/tests';

export default function StudentTest({ testId }: { testId: number }) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s:any)=>s.user);
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await testsApi.getTest(testId);
        setTest(t);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  if (loading) return <div>Загрузка...</div>;
  if (!test) return <div>Тест не найден</div>;

  const handleChange = (qId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        test_id: test.id,
        user_id: currentUser?.id || 0,
        answers: Object.entries(answers).map(([qid, ans]) => ({ question_id: Number(qid), answer: ans }))
      };
      const res = await testsApi.submitAttempt(null, payload);
      alert('Отправлено. Баллы: ' + res.score);
      // Перенаправим в профиль, где тест должен перейти в "Прошедшие"
      navigate('/profile');
    } catch (e:any) {
      alert(e.message || 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>{test.title}</h1>
      {test.sections.map((s:any) => (
        <div key={s.id}>
          <h2>{s.title}</h2>
          {s.questions.map((q:any) => (
            <div key={q.id} style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem' }}>
              <div>{q.text}</div>
              {q.type === 'single' && q.meta?.variants && q.meta.variants.map((v:any) => (
                <label key={v.id}><input type="radio" name={`q${q.id}`} onChange={() => handleChange(q.id, v.id)} /> {v.text}</label>
              ))}

              {q.type === 'multiple' && q.meta?.variants && q.meta.variants.map((v:any) => (
                <label key={v.id}><input type="checkbox" onChange={(e)=>{
                  const cur = answers[q.id] || [];
                  if(e.target.checked) handleChange(q.id, [...cur, v.id]); else handleChange(q.id, cur.filter((x:number)=>x!==v.id))
                }} /> {v.text}</label>
              ))}

              {q.type === 'open' && (
                <textarea onChange={(e)=>handleChange(q.id, e.target.value)} />
              )}

              {q.type === 'match' && q.meta?.matches && q.meta.matches.map((m:any, idx:number) => (
                <div key={m.id}>
                  <span>{m.left}</span>
                  <select onChange={(e)=>{
                    const cur = answers[q.id] || [];
                    cur[idx] = { left: m.left, right: e.target.value };
                    handleChange(q.id, cur);
                  }}>
                    <option value="">---</option>
                    {q.meta.matches.map((mm:any)=>(<option key={mm.id} value={mm.right}>{mm.right}</option>))}
                  </select>
                </div>
              ))}

              {q.type === 'order' && q.meta?.orderItems && (
                <div>
                  <p>Перетащите в нужном порядке (упрощённо: выберите позиции)</p>
                  {q.meta.orderItems.map((oi:any, idx:number) => (
                    <div key={oi.id}>
                      <span>{oi.text}</span>
                      <select onChange={(e)=>{
                        const cur = answers[q.id] || [];
                        cur[idx] = e.target.value; // store id
                        handleChange(q.id, cur);
                      }}>
                        <option value="">---</option>
                        {q.meta.orderItems.map((mm:any)=>(<option key={mm.id} value={mm.id}>{mm.text}</option>))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>
      ))}

      <button onClick={handleSubmit} disabled={submitting}>Отправить</button>
    </div>
  );
}
