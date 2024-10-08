import http from 'k6/http';
import { check, sleep } from 'k6';

function taskCreationPayload() {
  return {
    title: "Load test - " + Math.floor(Math.random() * 20000),
    projectId: "66e0d675d32fd52f1bdcb6f3",
    parentTaskId: null
  }
}

export const options = {
  vus: 1,
  iterations: 10

  // ==== Concurrent user testing ====
  // scenarios: {
  //   contacts: {
  //     executor: 'constant-vus',
  //     vus: 20,
  //     duration: '1m',
  //   },ev
  // },
};

export default function () {
  const res = http.post(
    'http://todolist-be-alb-1-1531462491.sa-east-1.elb.amazonaws.com/task',
    JSON.stringify(taskCreationPayload()),
    {headers: { 'Content-Type': 'application/json' }}
  );
  check(res, { 'status was 200': (r) => r.status == 201 });
  if (res.status !== 201) {
    console.log(res)
  }
  sleep(Math.floor(Math.random() * 4) + 1);
}