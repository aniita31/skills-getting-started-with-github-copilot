from fastapi.testclient import TestClient
import sys
import os

# Add src to path so tests can import app
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
import app as myapp


client = TestClient(myapp.app)


def test_get_activities():
    resp = client.get('/activities')
    assert resp.status_code == 200
    data = resp.json()
    # Expect some known activity keys to exist
    assert 'Soccer Team' in data
    assert isinstance(data['Soccer Team']['participants'], list)


def test_signup_and_unregister_flow():
    email = 'pytest-user@example.com'
    activity = 'Chess Club'

    # Ensure user not present
    resp = client.get('/activities')
    participants = resp.json()[activity]['participants']
    if email in participants:
        client.delete(f"/activities/{activity}/participants?email={email}")

    # Signup
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert 'Signed up' in resp.json().get('message', '')

    # Confirm present
    resp = client.get('/activities')
    assert email in resp.json()[activity]['participants']

    # Unregister
    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 200
    assert 'Unregistered' in resp.json().get('message', '')

    # Confirm removed
    resp = client.get('/activities')
    assert email not in resp.json()[activity]['participants']


def test_unregister_nonexistent_participant():
    email = 'does-not-exist@example.com'
    activity = 'Art Club'
    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 404
    assert 'Participant not found' in resp.json().get('detail', '')
