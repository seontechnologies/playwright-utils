import { useNavigate, Link } from 'react-router-dom'
import styled from 'styled-components'
import { SButton } from '../../styles/styled-components'
import { useAuth } from '../../hooks/use-auth'

type UserHeaderProps = {
  className?: string
}

/**
 * Header component that displays the current user information and logout button
 * Uses the useAuth hook to access user information and logout functionality
 */
export const UserHeader = ({ className = '' }: UserHeaderProps) => {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    // Call logout and wait for any potential async operations to complete
    await Promise.resolve(logout())

    // After tokens are cleared, navigate to login page
    await navigate('/login')
  }

  // Don't render anything if not authenticated
  if (!currentUser) {
    return null
  }

  return (
    <SHeader className={className}>
      <SUserInfo>
        <SUserName>{currentUser.username || 'User'}</SUserName>
        <SUserIdentifier>
          {currentUser.userIdentifier || 'Unknown User Identifier'}
        </SUserIdentifier>
      </SUserInfo>
      <SNavigation>
        <SNavLink to="/movies" data-testid="nav-movies">
          Movies
        </SNavLink>
        <SNavLink to="/downloads" data-testid="nav-downloads">
          Downloads
        </SNavLink>
        <SLogoutButton onClick={handleLogout} aria-label="Logout">
          Logout
        </SLogoutButton>
      </SNavigation>
    </SHeader>
  )
}

export default UserHeader

// Styled components for the header
const SHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #283747; /* Adjusted to match the screenshot */
  color: #fff;
  font-family: Times, serif;
`

const SNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const SNavLink = styled(Link)`
  color: #fff;
  text-decoration: none;
  font-family: Times, serif;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s ease;

  &:hover {
    border-bottom-color: #fff;
  }
`

const SUserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`

const SUserName = styled.span`
  font-weight: normal;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  font-family: Times, serif;
`

const SUserIdentifier = styled.span`
  font-size: 0.8rem;
  opacity: 0.8;
  font-family: Times, serif;
`

const SLogoutButton = styled(SButton)`
  background-color: #ff6347;
  color: #fff;
  border: none;
  margin: 0;
  padding: 5px 10px;
  font-family: Times, serif;
  border-radius: 0;
  font-weight: normal;

  &:hover {
    background-color: #e5533d;
  }
`
